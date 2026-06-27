/**
 * tests/unit/utils/ApiError.test.ts
 *
 * Full coverage of every static factory and the base constructor.
 */
import { describe, it, expect } from "vitest";
import { ApiError } from "../.././src/utils/ApiError";

describe("ApiError — constructor", () => {
  it("sets statusCode, message, code and isOperational", () => {
    const err = new ApiError(422, "Unprocessable", "VALIDATION");
    expect(err.statusCode).toBe(422);
    expect(err.message).toBe("Unprocessable");
    expect(err.code).toBe("VALIDATION");
    expect(err.isOperational).toBe(true);
  });

  it("defaults code to INTERNAL_ERROR when omitted", () => {
    expect(new ApiError(500, "boom").code).toBe("INTERNAL_ERROR");
  });

  it("is an instance of Error", () => {
    expect(new ApiError(400, "bad")).toBeInstanceOf(Error);
  });

  it("captures a stack trace", () => {
    expect(new ApiError(400, "bad").stack).toBeDefined();
  });
});

describe("ApiError.badRequest", () => {
  it("returns 400 / BAD_REQUEST with the given message", () => {
    const err = ApiError.badRequest("Missing field");
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.message).toBe("Missing field");
  });

  it("accepts a custom code", () => {
    expect(ApiError.badRequest("msg", "INVALID_SKU").code).toBe("INVALID_SKU");
  });
});

describe("ApiError.unauthorized", () => {
  it("returns 401 / UNAUTHORIZED / 'Unauthorized' by default", () => {
    const err = ApiError.unauthorized();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe("UNAUTHORIZED");
    expect(err.message).toBe("Unauthorized");
  });

  it("accepts a custom message", () => {
    expect(ApiError.unauthorized("No token provided").message).toBe(
      "No token provided",
    );
  });
});

describe("ApiError.forbidden", () => {
  it("returns 403 / FORBIDDEN / 'Forbidden' by default", () => {
    const err = ApiError.forbidden();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe("FORBIDDEN");
    expect(err.message).toBe("Forbidden");
  });

  it("accepts a custom message", () => {
    expect(ApiError.forbidden("Admin access required").message).toBe(
      "Admin access required",
    );
  });
});

describe("ApiError.notFound", () => {
  it("returns 404 / NOT_FOUND", () => {
    const err = ApiError.notFound("Product not found");
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe("NOT_FOUND");
    expect(err.message).toBe("Product not found");
  });

  it("accepts a custom code", () => {
    expect(ApiError.notFound("Order missing", "ORDER_NOT_FOUND").code).toBe(
      "ORDER_NOT_FOUND",
    );
  });
});

describe("ApiError.conflict", () => {
  it("returns 409 / CONFLICT", () => {
    const err = ApiError.conflict("Email already in use");
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe("CONFLICT");
    expect(err.message).toBe("Email already in use");
  });

  it("accepts a custom code", () => {
    expect(ApiError.conflict("Duplicate SKU", "DUPLICATE_SKU").code).toBe(
      "DUPLICATE_SKU",
    );
  });
});

describe("ApiError.internal", () => {
  it("returns 500 / INTERNAL_ERROR / default message", () => {
    const err = ApiError.internal();
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe("INTERNAL_ERROR");
    expect(err.message).toBe("Internal server error");
  });

  it("accepts a custom message", () => {
    expect(ApiError.internal("DB connection lost").message).toBe(
      "DB connection lost",
    );
  });
});
