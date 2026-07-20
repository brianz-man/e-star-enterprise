import { describe, it, expect } from "vitest";
import { generateOrderNumber } from "./../../src/utils/generateOrderNumber";

describe("generateOrderNumber", () => {
  it("returns a string prefixed with 'ES-'", () => {
    expect(generateOrderNumber()).toMatch(/^ES-/);
  });

  it("matches the pattern ES-<TIMESTAMP36>-<RANDOM_HEX>", () => {
  
    expect(generateOrderNumber()).toMatch(/^ES-[0-9A-Z]+-[0-9A-F]{10}$/);
  });

  it("generates fully unique values under concurrent-style volume", () => {
   
    const numbers = new Set(
      Array.from({ length: 10_000 }, generateOrderNumber),
    );
    expect(numbers.size).toBe(10_000);
  });

  it("is uppercase", () => {
    const n = generateOrderNumber();
    expect(n).toBe(n.toUpperCase());
  });
});