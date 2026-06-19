/**
 * tests/integration/errorHandler.test.ts
 *
 * Integration tests for errorHandler and notFoundHandler.
 * Mounts them on a minimal Express app via supertest.
 */
import { describe, it, expect, vi, beforeAll } from "vitest";
import request from "supertest";
import express, { Express, Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

// Mock env before importing errorHandler (it reads env.isDev)
vi.mock("../../../src/config/env", () => ({
  env: { isDev: true, jwt: { secret: "test" }, node: "test" },
}));

import {
  errorHandler,
  notFoundHandler,
} from "../../src/middlewares/errorHandler";
import { ApiError } from "./../../src/utils/ApiError";

// ─── App factory ──────────────────────────────────────────────────────────────

const buildApp = (
  routeFn: (req: Request, res: Response, next: NextFunction) => void,
): Express => {
  const app = express();
  app.use(express.json());
  app.get("/test", routeFn);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
};

// ─── ApiError handling ────────────────────────────────────────────────────────

describe("errorHandler — ApiError", () => {
  it("returns the correct status code and body for badRequest", async () => {
    const app = buildApp((_req, _res, next) => {
      next(ApiError.badRequest("Missing field"));
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(400);
    expect(res.body).toMatchObject({
      success: false,
      error: "Missing field",
      code: "BAD_REQUEST",
    });
  });

  it("returns 401 for unauthorized", async () => {
    const app = buildApp((_req, _res, next) => {
      next(ApiError.unauthorized("No token"));
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(401);
    expect(res.body.code).toBe("UNAUTHORIZED");
  });

  it("returns 403 for forbidden", async () => {
    const app = buildApp((_req, _res, next) => {
      next(ApiError.forbidden("Admin only"));
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(403);
    expect(res.body.code).toBe("FORBIDDEN");
  });

  it("returns 404 for notFound", async () => {
    const app = buildApp((_req, _res, next) => {
      next(ApiError.notFound("Product not found"));
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });

  it("returns 409 for conflict", async () => {
    const app = buildApp((_req, _res, next) => {
      next(ApiError.conflict("Email exists"));
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
  });

  it("returns 500 for internal", async () => {
    const app = buildApp((_req, _res, next) => {
      next(ApiError.internal());
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("INTERNAL_ERROR");
  });
});

// ─── Prisma error handling ────────────────────────────────────────────────────

describe("errorHandler — Prisma errors", () => {
  it("returns 409 for P2002 (unique constraint)", async () => {
    const app = buildApp((_req, _res, next) => {
      const err = new Prisma.PrismaClientKnownRequestError(
        "Unique constraint",
        {
          code: "P2002",
          clientVersion: "5.0.0",
          meta: { target: ["email"] },
        },
      );
      next(err);
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(409);
    expect(res.body.code).toBe("CONFLICT");
    expect(res.body.error).toContain("email");
  });

  it("returns 404 for P2025 (record not found)", async () => {
    const app = buildApp((_req, _res, next) => {
      const err = new Prisma.PrismaClientKnownRequestError("Not found", {
        code: "P2025",
        clientVersion: "5.0.0",
      });
      next(err);
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(404);
    expect(res.body.code).toBe("NOT_FOUND");
  });
});

// ─── Unknown errors ───────────────────────────────────────────────────────────

describe("errorHandler — unknown errors", () => {
  it("returns 500 with message exposed in dev mode", async () => {
    const app = buildApp((_req, _res, next) => {
      next(new Error("Some unexpected crash"));
    });
    const res = await request(app).get("/test");
    expect(res.status).toBe(500);
    expect(res.body.code).toBe("INTERNAL_ERROR");
    // isDev = true so message should be exposed
    expect(res.body.error).toBe("Some unexpected crash");
  });

  it("includes stack in dev mode", async () => {
    const app = buildApp((_req, _res, next) => {
      next(new Error("crash"));
    });
    const res = await request(app).get("/test");
    expect(res.body.stack).toBeDefined();
  });
});

// ─── notFoundHandler ──────────────────────────────────────────────────────────

describe("notFoundHandler", () => {
  let app: Express;
  beforeAll(() => {
    app = express();
    app.use(notFoundHandler);
  });

  it("returns 404 with ROUTE_NOT_FOUND for unknown routes", async () => {
    const res = await request(app).get("/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.body).toMatchObject({
      success: false,
      code: "ROUTE_NOT_FOUND",
    });
    expect(res.body.error).toContain("/does-not-exist");
  });

  it("includes the HTTP method in the error message", async () => {
    const res = await request(app).post("/missing");
    expect(res.body.error).toContain("POST");
  });
});
