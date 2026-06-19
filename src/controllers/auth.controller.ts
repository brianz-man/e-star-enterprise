/**
 * auth.controller.ts
 *
 * REQUIRES: schema.prisma migration applied + `npx prisma generate` run.
 *
 * The new RefreshToken model uses `tokenHash` (SHA-256 of raw token).
 * The User model has `isDeleted` soft-delete field.
 * Both are defined in the fixed schema.prisma — run the migration first.
 *
 *   npx prisma migrate dev --name production_hardening
 *   (or for existing prod DB: npx prisma migrate deploy)
 */
import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { RegisterInput, LoginInput } from "../validators/auth.validator";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** SHA-256 of the raw token — what we store in DB */
const hashToken = (raw: string) =>
  crypto.createHash("sha256").update(raw).digest("hex");

/** Issue access token + generate a new raw refresh token */
const signTokens = (userId: string, email: string, role: string) => {
  const accessToken = jwt.sign({ userId, email, role }, env.jwt.secret, {
    expiresIn: env.jwt.expiresIn,
  } as jwt.SignOptions);

  // 64-byte random hex — client receives this; DB stores only the hash
  const rawRefreshToken = crypto.randomBytes(64).toString("hex");
  return { accessToken, rawRefreshToken };
};

const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true, // HTTPS only
  sameSite: "strict" as const,
  maxAge: REFRESH_TTL_MS,
};

/** Persist a hashed refresh token for a user */
const saveRefreshToken = (userId: string, raw: string) =>
  prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(raw), // field added by migration
      userId,
      expiresAt: new Date(Date.now() + REFRESH_TTL_MS),
    },
  });

// ─── Register ─────────────────────────────────────────────────────────────────

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, phone } =
    req.body as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    throw ApiError.conflict("Email already registered", "EMAIL_IN_USE");

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);

  const user = await prisma.user.create({
    data: { firstName, lastName, email, passwordHash, phone },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      role: true,
      // Note: `isDeleted` is available after migration + prisma generate
    },
  });

  await prisma.cart.create({ data: { userId: user.id } });

  const { accessToken, rawRefreshToken } = signTokens(
    user.id,
    user.email,
    user.role,
  );
  await saveRefreshToken(user.id, rawRefreshToken);

  res.cookie("refreshToken", rawRefreshToken, COOKIE_OPTIONS);
  res.status(201).json({ success: true, accessToken, user });
});

// ─── Login ────────────────────────────────────────────────────────────────────

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });

  // Guard works whether or not migration has run:
  // - After migration: isDeleted field exists → checked properly
  // - Before migration: field is undefined → (undefined === true) is false → safe fallback
  const isDeleted =
    (user as unknown as Record<string, unknown>)?.isDeleted === true;

  if (!user || !user.isActive || isDeleted)
    throw ApiError.unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  const { accessToken, rawRefreshToken } = signTokens(
    user.id,
    user.email,
    user.role,
  );
  await saveRefreshToken(user.id, rawRefreshToken);

  res.cookie("refreshToken", rawRefreshToken, COOKIE_OPTIONS);
  res.json({
    success: true,
    accessToken,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
    },
  });
});

// ─── Refresh (token rotation) ─────────────────────────────────────────────────

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.refreshToken as string | undefined;
  if (!rawToken) throw ApiError.unauthorized("No refresh token");

  // Look up by hash — raw token is never stored in DB
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true }, // `user` relation available after migration
  });

  if (!stored || stored.revoked || stored.expiresAt < new Date()) {
    // Reuse / expiry detected — revoke entire family for this user (if we can identify them)
    if (stored) {
      await prisma.refreshToken.updateMany({
        where: { userId: stored.userId },
        data: { revoked: true },
      });
    }
    res.clearCookie("refreshToken");
    throw ApiError.unauthorized("Refresh token invalid or expired");
  }

  const user = stored.user;
  const isDeleted =
    (user as unknown as Record<string, unknown>)?.isDeleted === true;
  if (!user.isActive || isDeleted) throw ApiError.unauthorized();

  // Rotate: revoke current token, issue fresh one
  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revoked: true },
  });

  const { accessToken, rawRefreshToken: newRaw } = signTokens(
    user.id,
    user.email,
    user.role,
  );
  await saveRefreshToken(user.id, newRaw);

  res.cookie("refreshToken", newRaw, COOKIE_OPTIONS);
  res.json({ success: true, accessToken });
});

// ─── Logout ───────────────────────────────────────────────────────────────────

export const logout = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.refreshToken as string | undefined;

  if (rawToken) {
    await prisma.refreshToken
      .updateMany({
        where: { tokenHash: hashToken(rawToken) },
        data: { revoked: true },
      })
      .catch(() => {
        // Non-fatal — token may not exist (e.g. already expired)
      });
  }

  res.clearCookie("refreshToken");
  res.json({ success: true, message: "Logged out" });
});

// ─── Get current user ─────────────────────────────────────────────────────────

export const getMe = asyncHandler(async (req: Request, res: Response) => {
  const user = await prisma.user.findUnique({
    where: { id: req.user!.userId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      role: true,
      isVerified: true,
      createdAt: true,
      addresses: true,
    },
  });
  if (!user) throw ApiError.notFound("User not found");
  res.json({ success: true, user });
});
