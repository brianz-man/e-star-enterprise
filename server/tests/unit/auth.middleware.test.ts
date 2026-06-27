/**
 * tests/unit/middleware/auth.middleware.test.ts
 *
 * Tests authenticate() and requireAdmin() from auth.middleware.ts.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

const TEST_SECRET = "test-jwt-secret-at-least-32-chars-long!!";

// ── Mock env before importing the middleware ──────────────────────────────────
// IMPORTANT: vi.mock is hoisted to the top of the file by Vitest, so the
// factory must use only literal values — never variables declared in this file.
vi.mock("../../src/config/env", () => ({
  env: {
    jwt: {
      secret: "test-jwt-secret-at-least-32-chars-long!!",
      refreshSecret: "refresh-secret",
      expiresIn: "15m",
    },
    isDev: true,
  },
}));

import {
  authenticate,
  requireAdmin,
} from "../../src/middlewares/auth.middleware";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeToken = (
  payload: object,
  secret = TEST_SECRET,
  opts: jwt.SignOptions = {},
) => jwt.sign(payload, secret, { expiresIn: "1h", ...opts });

const mockReq = (overrides: Partial<Request> = {}): Request =>
  ({ headers: {}, ...overrides }) as unknown as Request;

const mockRes = () => {
  const r = {} as Response;
  r.status = vi.fn().mockReturnValue(r);
  r.json = vi.fn().mockReturnValue(r);
  return r;
};

const next = vi.fn() as unknown as NextFunction;

// ─── authenticate ─────────────────────────────────────────────────────────────

describe("authenticate", () => {
  beforeEach(() => vi.clearAllMocks());

  it("sets req.user and calls next() for a valid Bearer token", () => {
    const payload = { userId: "u1", email: "a@e-star.co.ke", role: "CUSTOMER" };
    const req = mockReq({
      headers: { authorization: `Bearer ${makeToken(payload)}` },
    });
    authenticate(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
    expect(next).toHaveBeenCalledWith(); // no error arg
    expect((req as any).user).toMatchObject(payload);
  });

  it("calls next(ApiError 401) when Authorization header is missing", () => {
    const req = mockReq();
    authenticate(req, mockRes(), next);
    expect(next).toHaveBeenCalledOnce();
    const err = (next as any).mock.calls[0][0];
    expect(err?.statusCode).toBe(401);
  });

  it("calls next(ApiError 401) when scheme is not Bearer", () => {
    const req = mockReq({
      headers: { authorization: `Token ${makeToken({ userId: "u" })}` },
    });
    authenticate(req, mockRes(), next);
    const err = (next as any).mock.calls[0][0];
    expect(err?.statusCode).toBe(401);
  });

  it("calls next(ApiError 401) for a tampered token", () => {
    const req = mockReq({
      headers: { authorization: "Bearer not.a.real.token" },
    });
    authenticate(req, mockRes(), next);
    const err = (next as any).mock.calls[0][0];
    expect(err?.statusCode).toBe(401);
    expect(err?.message).toMatch(/Invalid or expired/);
  });

  it("calls next(ApiError 401) for a token signed with the wrong secret", () => {
    const token = makeToken(
      { userId: "u", email: "x@y.com", role: "ADMIN" },
      "wrong-secret",
    );
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    authenticate(req, mockRes(), next);
    expect((next as any).mock.calls[0][0]?.statusCode).toBe(401);
  });

  it("calls next(ApiError 401) for an expired token", () => {
    const token = jwt.sign({ userId: "u", role: "CUSTOMER" }, TEST_SECRET, {
      expiresIn: "0s",
    });
    const req = mockReq({ headers: { authorization: `Bearer ${token}` } });
    authenticate(req, mockRes(), next);
    expect((next as any).mock.calls[0][0]?.statusCode).toBe(401);
  });
});

// ─── requireAdmin ─────────────────────────────────────────────────────────────

describe("requireAdmin", () => {
  beforeEach(() => vi.clearAllMocks());

  const makeReqWithRole = (role: string) => {
    const req = mockReq() as any;
    req.user = { userId: "u1", email: "a@e-star.co.ke", role };
    return req as Request;
  };

  it("calls next() for ADMIN role", () => {
    requireAdmin(makeReqWithRole("ADMIN"), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next() for SUPERADMIN role", () => {
    requireAdmin(makeReqWithRole("SUPERADMIN"), mockRes(), next);
    expect(next).toHaveBeenCalledWith();
  });

  it("calls next(ApiError 403) for CUSTOMER role", () => {
    requireAdmin(makeReqWithRole("CUSTOMER"), mockRes(), next);
    expect((next as any).mock.calls[0][0]?.statusCode).toBe(403);
  });

  it("calls next(ApiError 401) when req.user is not set", () => {
    requireAdmin(mockReq() as any, mockRes(), next);
    expect((next as any).mock.calls[0][0]?.statusCode).toBe(401);
  });
});
