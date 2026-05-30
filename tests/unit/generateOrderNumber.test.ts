/**
 * tests/unit/utils/generateOrderNumber.test.ts
 */
import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "./../../src/utils/generateOrderNumber";

describe("generateOrderNumber", () => {
  it("returns a string prefixed with 'ES-'", () => {
    expect(generateOrderNumber()).toMatch(/^ES-/);
  });

  it("matches the pattern ES-<TIMESTAMP36>-<RANDOM4>", () => {
    // ES- then base-36 uppercase timestamp, hyphen, 4 uppercase base-36 chars
    expect(generateOrderNumber()).toMatch(/^ES-[0-9A-Z]+-[0-9A-Z]{4}$/);
  });

  it("generates unique values on successive calls", () => {
    const numbers = new Set(Array.from({ length: 100 }, generateOrderNumber));
    // Allow a tiny collision margin; 100 calls should be fully unique in practice
    expect(numbers.size).toBeGreaterThanOrEqual(99);
  });

  it("is uppercase", () => {
    const n = generateOrderNumber();
    expect(n).toBe(n.toUpperCase());
  });
});
