/**
 * tests/unit/utils/asyncHandler.test.ts
 *
 * Verifies that asyncHandler correctly forwards Promise rejections to next().
 */
import { describe, it, expect, vi } from "vitest";
import { Request, Response, NextFunction } from "express";
import { asyncHandler } from "../.././src/utils/asyncHandler";

const mockReq = {} as Request;
const mockRes = {} as Response;
const mockNext = vi.fn() as unknown as NextFunction;

describe("asyncHandler", () => {
  it("calls next(err) when the async handler rejects", async () => {
    const error = new Error("something went wrong");
    const handler = asyncHandler(async () => {
      throw error;
    });

    handler(mockReq, mockRes, mockNext);
    // Let the microtask queue flush
    await new Promise((r) => setTimeout(r, 0));

    expect(mockNext).toHaveBeenCalledWith(error);
  });

  it("does NOT call next() when the handler resolves normally", async () => {
    vi.clearAllMocks();
    const handler = asyncHandler(async (_req, res) => {
      (res as any).sent = true;
    });

    handler(mockReq, mockRes, mockNext);
    await new Promise((r) => setTimeout(r, 0));

    expect(mockNext).not.toHaveBeenCalled();
  });

  it("returns a synchronous RequestHandler (not a Promise)", () => {
    const handler = asyncHandler(async () => {});
    // handler must be callable as (req, res, next) — not awaited by Express
    expect(typeof handler).toBe("function");
    expect(handler.length).toBe(3);
  });

  it("forwards non-Error rejection values to next()", async () => {
    vi.clearAllMocks();
    const handler = asyncHandler(async () => {
      throw "string error";
    });

    handler(mockReq, mockRes, mockNext);
    await new Promise((r) => setTimeout(r, 0));

    expect(mockNext).toHaveBeenCalledWith("string error");
  });
});
