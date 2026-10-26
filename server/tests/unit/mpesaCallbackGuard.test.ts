import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";

vi.mock("../../src/config/env", () => ({
  env: {
    mpesa: {
      callbackToken: "secret-token",
      callbackIps: ["203.0.113.1"],
    },
    isProd: false,
  },
}));

import { mpesaCallbackGuard } from "../../src/middlewares/mpesaCallbackGuard";
import { env } from "../../src/config/env";

const mockReq = (overrides: Partial<Request> = {}): Request =>
  ({
    query: {},
    headers: {},
    ip: "203.0.113.1",
    socket: { remoteAddress: "203.0.113.1" },
    path: "/api/v1/payments/mpesa/callback",
    ...overrides,
  }) as Request;

const mockRes = (): Response => {
  const res = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
  };
  return res as unknown as Response;
};

describe("mpesaCallbackGuard", () => {
  let next: NextFunction;

  beforeEach(() => {
    next = vi.fn();
    env.isProd = false;
    env.mpesa.callbackToken = "secret-token";
    env.mpesa.callbackIps = ["203.0.113.1"];
  });

  it("calls next when token and IP are valid", () => {
    const req = mockReq({ query: { token: "secret-token" } });
    const res = mockRes();

    mpesaCallbackGuard(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  it("rejects invalid callback token", () => {
    const req = mockReq({ query: { token: "wrong" } });
    const res = mockRes();

    mpesaCallbackGuard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("rejects IP not on allowlist", () => {
    const req = mockReq({
      query: { token: "secret-token" },
      ip: "198.51.100.99",
      headers: {},
    });
    const res = mockRes();

    mpesaCallbackGuard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("does not trust a client-supplied forwarded IP", () => {
    const req = mockReq({
      query: { token: "secret-token" },
      ip: "198.51.100.99",
      headers: { "x-forwarded-for": "203.0.113.1" },
    });
    const res = mockRes();

    mpesaCallbackGuard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(next).not.toHaveBeenCalled();
  });

  it("fails closed in production when callback protection is not configured", () => {
    env.isProd = true;
    env.mpesa.callbackToken = "";
    env.mpesa.callbackIps = [];
    const req = mockReq();
    const res = mockRes();

    mpesaCallbackGuard(req, res, next);

    expect(res.status).toHaveBeenCalledWith(503);
    expect(next).not.toHaveBeenCalled();
  });
});
