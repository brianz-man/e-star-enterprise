import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { prisma } from "../config/db";
import { env } from "../config/env";
import { asyncHandler } from "../utils/asyncHandler";
import { ApiError } from "../utils/ApiError";
import { RegisterInput, LoginInput } from "../validators/auth.validator";
import {
  sendVerificationEmail,
  sendPasswordResetEmail,
} from "../services/email.service";

//  Helpers

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

/** Persist a hashed refresh token for a user */
const saveRefreshToken = (userId: string, raw: string) =>
  prisma.refreshToken.create({
    data: {
      tokenHash: hashToken(raw), // field added by migration
      userId,
      expiresAt: new Date(Date.now() + env.jwt.refreshTtlMs),
    },
  });

//  Register

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { firstName, lastName, email, password, phone } =
    req.body as RegisterInput;

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing)
    throw ApiError.conflict("Email already registered", "EMAIL_IN_USE");

  const passwordHash = await bcrypt.hash(password, env.bcryptRounds);

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { firstName, lastName, email, passwordHash, phone },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        isVerified: true,
      },
    });
    await tx.cart.create({ data: { userId: created.id } });
    return created;
  });

  // Verification is advisory under the current authorization policy. A
  // delivery outage must not reject an otherwise valid registration.
  const verificationToken = await replaceVerificationToken(user.id);
  const delivered = await sendVerificationEmail(
    user.email,
    user.firstName,
    verificationToken,
  );
  if (!delivered) {
    await prisma.verificationToken.deleteMany({
      where: { tokenHash: hashToken(verificationToken) },
    });
  }

  const { accessToken, rawRefreshToken } = signTokens(
    user.id,
    user.email,
    user.role,
  );
  await saveRefreshToken(user.id, rawRefreshToken);

  res.cookie("refreshToken", rawRefreshToken, env.cookie);
  res.status(201).json({ success: true, accessToken, user });
});

//  Login

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body as LoginInput;

  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) throw ApiError.unauthorized("Invalid email or password");

  // Check if user is active and not soft-deleted
  const isDeleted = "isDeleted" in user ? user.isDeleted : false;

  if (!user.isActive || isDeleted)
    throw ApiError.unauthorized("Invalid email or password");

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) throw ApiError.unauthorized("Invalid email or password");

  const { accessToken, rawRefreshToken } = signTokens(
    user.id,
    user.email,
    user.role,
  );
  await saveRefreshToken(user.id, rawRefreshToken);

  res.cookie("refreshToken", rawRefreshToken, env.cookie);
  res.json({
    success: true,
    accessToken,
    user: {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      role: user.role,
      isVerified: user.isVerified,
    },
  });
});

//  Refresh (token rotation)

export const refresh = asyncHandler(async (req: Request, res: Response) => {
  const rawToken = req.cookies?.refreshToken as string | undefined;
  if (!rawToken) throw ApiError.unauthorized("No refresh token");

  // Look up by hash — raw token is never stored in DB
  const stored = await prisma.refreshToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
    include: { user: true },
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

  // Check if user is active and not soft-deleted
  const isDeleted = "isDeleted" in user ? user.isDeleted : false;
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

  res.cookie("refreshToken", newRaw, env.cookie);
  res.json({ success: true, accessToken });
});

//  Logout

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

//  Get current user

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

//  Email Verification

/** Generate a 32-byte verification token */
const generateVerificationToken = () => crypto.randomBytes(32).toString("hex");

const replaceVerificationToken = async (userId: string): Promise<string> => {
  const rawToken = generateVerificationToken();
  await prisma.$transaction([
    prisma.verificationToken.deleteMany({ where: { userId } }),
    prisma.verificationToken.create({
      data: {
        tokenHash: hashToken(rawToken),
        userId,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      },
    }),
  ]);
  return rawToken;
};

const replacePasswordResetToken = async (userId: string): Promise<string> => {
  const rawToken = generateVerificationToken();
  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId } }),
    prisma.passwordResetToken.create({
      data: {
        tokenHash: hashToken(rawToken),
        userId,
        expiresAt: new Date(Date.now() + 60 * 60 * 1000),
      },
    }),
  ]);
  return rawToken;
};

export const sendVerificationEmail_handler = asyncHandler(
  async (req: Request, res: Response) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
    });
    if (!user) throw ApiError.notFound("User not found");
    if (user.isVerified) throw ApiError.conflict("Email already verified");

    const rawToken = await replaceVerificationToken(user.id);
    const delivered = await sendVerificationEmail(
      user.email,
      user.firstName,
      rawToken,
    );
    if (!delivered) {
      await prisma.verificationToken.deleteMany({
        where: { tokenHash: hashToken(rawToken) },
      });
      throw ApiError.internal("Unable to send verification email");
    }

    res.json({ success: true, message: "Verification email sent" });
  },
);

export const verifyEmail = asyncHandler(async (req: Request, res: Response) => {
  const { token } = req.body as { token: string };
  if (!token) throw ApiError.badRequest("Verification token required");

  const tokenRecord = await prisma.verificationToken.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  });

  if (!tokenRecord) throw ApiError.badRequest("Invalid or expired token");
  if (tokenRecord.expiresAt < new Date())
    throw ApiError.badRequest("Token expired");

  await prisma.$transaction(async (tx) => {
    const consumed = await tx.verificationToken.deleteMany({
      where: { id: tokenRecord.id, expiresAt: { gt: new Date() } },
    });
    if (consumed.count !== 1)
      throw ApiError.badRequest("Invalid or expired token");
    await tx.user.update({
      where: { id: tokenRecord.userId },
      data: { isVerified: true },
    });
  });

  res.json({ success: true, message: "Email verified successfully" });
});

//  Password Reset

export const forgotPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { email } = req.body as { email: string };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive || user.isDeleted) {
      // Don't reveal if email exists (security best practice)
      return res.json({
        success: true,
        message: "If email exists, reset link has been sent",
      });
    }

    const rawToken = await replacePasswordResetToken(user.id);
    const delivered = await sendPasswordResetEmail(
      user.email,
      user.firstName,
      rawToken,
    );
    if (!delivered) {
      await prisma.passwordResetToken.deleteMany({
        where: { tokenHash: hashToken(rawToken) },
      });
    }

    res.json({
      success: true,
      message: "If email exists, reset link has been sent",
    });
  },
);

export const resetPassword = asyncHandler(
  async (req: Request, res: Response) => {
    const { token, password } = req.body as { token: string; password: string };

    if (!token) throw ApiError.badRequest("Reset token required");
    if (!password || password.length < 8)
      throw ApiError.badRequest("Password must be at least 8 characters");

    const tokenRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash: hashToken(token) },
      include: { user: true },
    });

    if (!tokenRecord) throw ApiError.badRequest("Invalid or expired token");
    if (tokenRecord.expiresAt < new Date())
      throw ApiError.badRequest("Token expired");

    // Hash new password
    const passwordHash = await bcrypt.hash(password, env.bcryptRounds);

    await prisma.$transaction(async (tx) => {
      const consumed = await tx.passwordResetToken.deleteMany({
        where: { id: tokenRecord.id, expiresAt: { gt: new Date() } },
      });
      if (consumed.count !== 1)
        throw ApiError.badRequest("Invalid or expired token");
      await tx.user.update({
        where: { id: tokenRecord.userId },
        data: { passwordHash },
      });
      await tx.refreshToken.updateMany({
        where: { userId: tokenRecord.userId, revoked: false },
        data: { revoked: true },
      });
    });

    res.json({ success: true, message: "Password reset successfully" });
  },
);
