/**
 * tests/unit/utils/formatPhone.test.ts
 *
 * Tests every supported input format and the error path.
 */
import { describe, it, expect } from "vitest";
import { formatPhone } from "./../../src/utils/formatPhone";

describe("formatPhone", () => {
  // ── Happy paths ────────────────────────────────────────────────────────────

  it("converts 07XXXXXXXX (leading 0, 10 digits) to 2547XXXXXXXX", () => {
    expect(formatPhone("0712345678")).toBe("254712345678");
  });

  it("converts 7XXXXXXXX (9 digits, no prefix) to 2547XXXXXXXX", () => {
    expect(formatPhone("712345678")).toBe("254712345678");
  });

  it("passes through an already-correct 254XXXXXXXXX (12 digits)", () => {
    expect(formatPhone("254712345678")).toBe("254712345678");
  });

  it("strips non-digit characters before normalising (e.g. +254-712-345-678)", () => {
    expect(formatPhone("+254712345678")).toBe("254712345678");
  });

  it("strips spaces from 07XX XXX XXX", () => {
    expect(formatPhone("0712 345 678")).toBe("254712345678");
  });

  // ── Edge cases ─────────────────────────────────────────────────────────────

  it("handles Safaricom 01X numbers (leading 0, 10 digits)", () => {
    expect(formatPhone("0110000000")).toBe("254110000000");
  });

  // ── Error paths ───────────────────────────────────────────────────────────

  it("throws for a number that is too short", () => {
    expect(() => formatPhone("0712")).toThrow("Invalid Kenyan phone number");
  });

  it("throws for a number that is too long", () => {
    expect(() => formatPhone("07123456789999")).toThrow(
      "Invalid Kenyan phone number",
    );
  });

  it("throws for an empty string", () => {
    expect(() => formatPhone("")).toThrow("Invalid Kenyan phone number");
  });

  it("throws for a non-Kenyan number (e.g. US format)", () => {
    expect(() => formatPhone("+14155552671")).toThrow(
      "Invalid Kenyan phone number",
    );
  });
});
