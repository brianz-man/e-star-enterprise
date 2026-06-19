/**
 * tests/unit/validators/validators.test.ts
 *
 * Tests all Zod schemas: auth, cart, order, product.
 * Uses schema.safeParse() so we can inspect errors without throwing.
 */
import { describe, it, expect } from "vitest";
import { ZodSafeParseResult, ZodSafeParseError } from "zod";
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "./../../src/validators/auth.validator";
import {
  addToCartSchema,
  updateCartItemSchema,
} from "./../../src/validators/cart.validation";
import {
  createOrderSchema,
  updateOrderStatusSchema,
  mpesaInitiateSchema,
} from "./../../src/validators/order.validator";
import {
  createProductSchema,
  updateProductSchema,
  productQuerySchema,
} from "./../../src/validators/product.validator";

// ─── Helpers ─────────────────────────────────────────────────────────────────

const ok = <T>(result: ZodSafeParseResult<unknown>): T => {
  if (!result.success) throw new Error(JSON.stringify(result.error.issues));
  return result.data as T;
};

const fail = (result: ZodSafeParseResult<unknown>) => {
  expect(result.success).toBe(false);
  return (result as ZodSafeParseError<unknown>).error.issues as {
    path: (string | number)[];
    message: string;
  }[];
};

// ─── Auth validators ─────────────────────────────────────────────────────────

describe("registerSchema", () => {
  const valid = {
    firstName: "Jane",
    lastName: "Doe",
    email: "jane@e-star.co.ke",
    password: "Secret1234",
  };

  it("accepts valid registration data", () => {
    expect(registerSchema.safeParse(valid).success).toBe(true);
  });

  it("accepts optional phone", () => {
    expect(
      registerSchema.safeParse({ ...valid, phone: "0712345678" }).success,
    ).toBe(true);
  });

  it("rejects firstName shorter than 2 chars", () => {
    const issues = fail(registerSchema.safeParse({ ...valid, firstName: "J" }));
    expect(issues.some((i) => i.path.includes("firstName"))).toBe(true);
  });

  it("rejects invalid email", () => {
    const issues = fail(
      registerSchema.safeParse({ ...valid, email: "not-an-email" }),
    );
    expect(issues.some((i) => i.path.includes("email"))).toBe(true);
  });

  it("rejects password shorter than 8 chars", () => {
    const issues = fail(
      registerSchema.safeParse({ ...valid, password: "Abc1" }),
    );
    expect(issues.some((i) => i.path.includes("password"))).toBe(true);
  });

  it("rejects password without an uppercase letter", () => {
    const issues = fail(
      registerSchema.safeParse({ ...valid, password: "secret1234" }),
    );
    expect(issues.some((i) => i.path.includes("password"))).toBe(true);
  });

  it("rejects password without a number", () => {
    const issues = fail(
      registerSchema.safeParse({ ...valid, password: "Secretword" }),
    );
    expect(issues.some((i) => i.path.includes("password"))).toBe(true);
  });
});

describe("loginSchema", () => {
  it("accepts valid credentials", () => {
    expect(
      loginSchema.safeParse({ email: "a@b.co", password: "pass" }).success,
    ).toBe(true);
  });

  it("rejects an empty password", () => {
    const issues = fail(
      loginSchema.safeParse({ email: "a@b.co", password: "" }),
    );
    expect(issues.some((i) => i.path.includes("password"))).toBe(true);
  });

  it("rejects invalid email", () => {
    const issues = fail(
      loginSchema.safeParse({ email: "bad", password: "pass" }),
    );
    expect(issues.some((i) => i.path.includes("email"))).toBe(true);
  });
});

describe("forgotPasswordSchema", () => {
  it("accepts a valid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "x@y.com" }).success).toBe(
      true,
    );
  });

  it("rejects invalid email", () => {
    expect(forgotPasswordSchema.safeParse({ email: "nope" }).success).toBe(
      false,
    );
  });
});

describe("resetPasswordSchema", () => {
  it("accepts valid token + password", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "abc123", password: "NewPass99" })
        .success,
    ).toBe(true);
  });

  it("rejects empty token", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "", password: "NewPass99" })
        .success,
    ).toBe(false);
  });

  it("rejects password shorter than 8 chars", () => {
    expect(
      resetPasswordSchema.safeParse({ token: "tok", password: "short" })
        .success,
    ).toBe(false);
  });
});

// ─── Cart validators ──────────────────────────────────────────────────────────

describe("addToCartSchema", () => {
  const validUUID = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts a valid productId + quantity", () => {
    expect(
      addToCartSchema.safeParse({ productId: validUUID, quantity: 2 }).success,
    ).toBe(true);
  });

  it("defaults quantity to 1 when omitted", () => {
    const result = addToCartSchema.safeParse({ productId: validUUID });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.quantity).toBe(1);
  });

  it("rejects a non-UUID productId", () => {
    expect(
      addToCartSchema.safeParse({ productId: "not-a-uuid", quantity: 1 })
        .success,
    ).toBe(false);
  });

  it("rejects quantity 0", () => {
    expect(
      addToCartSchema.safeParse({ productId: validUUID, quantity: 0 }).success,
    ).toBe(false);
  });

  it("rejects quantity > 50", () => {
    expect(
      addToCartSchema.safeParse({ productId: validUUID, quantity: 51 }).success,
    ).toBe(false);
  });

  it("rejects non-integer quantity", () => {
    expect(
      addToCartSchema.safeParse({ productId: validUUID, quantity: 1.5 })
        .success,
    ).toBe(false);
  });
});

describe("updateCartItemSchema", () => {
  it("accepts quantity 1–50", () => {
    expect(updateCartItemSchema.safeParse({ quantity: 10 }).success).toBe(true);
  });

  it("rejects quantity 0", () => {
    expect(updateCartItemSchema.safeParse({ quantity: 0 }).success).toBe(false);
  });

  it("rejects quantity 51", () => {
    expect(updateCartItemSchema.safeParse({ quantity: 51 }).success).toBe(
      false,
    );
  });
});

// ─── Order validators ─────────────────────────────────────────────────────────

describe("createOrderSchema", () => {
  const validAddress = {
    firstName: "Jane",
    lastName: "Doe",
    phone: "0712345678",
    county: "Nairobi",
    town: "Westlands",
    street: "Waiyaki Way",
  };

  it("accepts a valid order with deliveryAddress", () => {
    expect(
      createOrderSchema.safeParse({ deliveryAddress: validAddress }).success,
    ).toBe(true);
  });

  it("accepts an optional addressId (UUID)", () => {
    expect(
      createOrderSchema.safeParse({
        addressId: "550e8400-e29b-41d4-a716-446655440000",
        deliveryAddress: validAddress,
      }).success,
    ).toBe(true);
  });

  it("accepts optional notes up to 500 chars", () => {
    expect(
      createOrderSchema.safeParse({
        deliveryAddress: validAddress,
        notes: "Leave at the gate",
      }).success,
    ).toBe(true);
  });

  it("rejects notes longer than 500 chars", () => {
    expect(
      createOrderSchema.safeParse({
        deliveryAddress: validAddress,
        notes: "x".repeat(501),
      }).success,
    ).toBe(false);
  });

  it("rejects when deliveryAddress.phone is too short", () => {
    const issues = fail(
      createOrderSchema.safeParse({
        deliveryAddress: { ...validAddress, phone: "123" },
      }),
    );
    expect(issues.some((i) => i.path.includes("phone"))).toBe(true);
  });

  it("rejects when deliveryAddress.street is too short", () => {
    const issues = fail(
      createOrderSchema.safeParse({
        deliveryAddress: { ...validAddress, street: "ab" },
      }),
    );
    expect(issues.some((i) => i.path.includes("street"))).toBe(true);
  });
});

describe("updateOrderStatusSchema", () => {
  const validStatuses = [
    "CONFIRMED",
    "PROCESSING",
    "SHIPPED",
    "DELIVERED",
    "CANCELLED",
  ];

  it.each(validStatuses)("accepts status '%s'", (status) => {
    expect(updateOrderStatusSchema.safeParse({ status }).success).toBe(true);
  });

  it("rejects an unknown status", () => {
    expect(
      updateOrderStatusSchema.safeParse({ status: "PENDING" }).success,
    ).toBe(false);
  });

  it("accepts an optional note", () => {
    expect(
      updateOrderStatusSchema.safeParse({
        status: "SHIPPED",
        note: "Sent via DHL",
      }).success,
    ).toBe(true);
  });
});

describe("mpesaInitiateSchema", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";

  it("accepts a valid orderId + phone", () => {
    expect(
      mpesaInitiateSchema.safeParse({ orderId: uuid, phone: "0712345678" })
        .success,
    ).toBe(true);
  });

  it("rejects a non-UUID orderId", () => {
    expect(
      mpesaInitiateSchema.safeParse({ orderId: "bad", phone: "0712345678" })
        .success,
    ).toBe(false);
  });

  it("rejects a phone shorter than 9 chars", () => {
    expect(
      mpesaInitiateSchema.safeParse({ orderId: uuid, phone: "07123" }).success,
    ).toBe(false);
  });
});

// ─── Product validators ───────────────────────────────────────────────────────

describe("createProductSchema", () => {
  const uuid = "550e8400-e29b-41d4-a716-446655440000";
  const valid = {
    name: "HP 305 Black Ink",
    description: "Genuine HP ink cartridge for DeskJet printers",
    sku: "HP305BK",
    price: 1500,
    brandId: uuid,
    categoryId: uuid,
  };

  it("accepts valid product data with defaults", () => {
    const result = createProductSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.stockQty).toBe(0);
      expect(result.data.lowStockAt).toBe(5);
      expect(result.data.isFeatured).toBe(false);
      expect(result.data.compatibility).toEqual([]);
    }
  });

  it("coerces sku to uppercase", () => {
    const result = createProductSchema.safeParse({ ...valid, sku: "hp305bk" });
    if (result.success) expect(result.data.sku).toBe("HP305BK");
  });

  it("rejects price ≤ 0", () => {
    expect(createProductSchema.safeParse({ ...valid, price: 0 }).success).toBe(
      false,
    );
    expect(createProductSchema.safeParse({ ...valid, price: -1 }).success).toBe(
      false,
    );
  });

  it("rejects negative stockQty", () => {
    expect(
      createProductSchema.safeParse({ ...valid, stockQty: -1 }).success,
    ).toBe(false);
  });

  it("rejects description shorter than 10 chars", () => {
    expect(
      createProductSchema.safeParse({ ...valid, description: "short" }).success,
    ).toBe(false);
  });

  it("rejects non-UUID brandId", () => {
    expect(
      createProductSchema.safeParse({ ...valid, brandId: "not-a-uuid" })
        .success,
    ).toBe(false);
  });

  it("accepts optional comparePrice and weight", () => {
    expect(
      createProductSchema.safeParse({
        ...valid,
        comparePrice: 1800,
        weight: 0.2,
      }).success,
    ).toBe(true);
  });

  it("accepts a compatibility array", () => {
    const result = createProductSchema.safeParse({
      ...valid,
      compatibility: [{ brand: "HP", printerModel: "DeskJet 2710" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a compatibility entry with empty brand", () => {
    expect(
      createProductSchema.safeParse({
        ...valid,
        compatibility: [{ brand: "", printerModel: "DeskJet" }],
      }).success,
    ).toBe(false);
  });
});

describe("updateProductSchema", () => {
  it("accepts an empty object (all fields optional)", () => {
    expect(updateProductSchema.safeParse({}).success).toBe(true);
  });

  it("accepts a partial update (price only)", () => {
    expect(updateProductSchema.safeParse({ price: 1200 }).success).toBe(true);
  });

  it("rejects an invalid partial field", () => {
    expect(updateProductSchema.safeParse({ price: -5 }).success).toBe(false);
  });
});

describe("productQuerySchema", () => {
  it("uses sensible defaults", () => {
    const result = productQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
      expect(result.data.sort).toBe("newest");
    }
  });

  it("coerces string page/limit to numbers", () => {
    const result = productQuerySchema.safeParse({ page: "2", limit: "10" });
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(10);
    }
  });

  it("rejects page < 1", () => {
    expect(productQuerySchema.safeParse({ page: "0" }).success).toBe(false);
  });

  it("rejects limit > 100", () => {
    expect(productQuerySchema.safeParse({ limit: "101" }).success).toBe(false);
  });

  it("accepts all valid sort values", () => {
    for (const sort of ["price_asc", "price_desc", "newest", "name_asc"]) {
      expect(productQuerySchema.safeParse({ sort }).success).toBe(true);
    }
  });

  it("rejects an unknown sort value", () => {
    expect(productQuerySchema.safeParse({ sort: "random" }).success).toBe(
      false,
    );
  });

  it("coerces featured string to boolean", () => {
    const result = productQuerySchema.safeParse({ featured: "true" });
    if (result.success) expect(result.data.featured).toBe(true);
  });

  it("accepts minPrice and maxPrice as numbers", () => {
    const result = productQuerySchema.safeParse({
      minPrice: "100",
      maxPrice: "5000",
    });
    if (result.success) {
      expect(result.data.minPrice).toBe(100);
      expect(result.data.maxPrice).toBe(5000);
    }
  });
});
