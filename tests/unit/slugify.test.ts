/**
 * tests/unit/utils/slugify.test.ts
 */
import { describe, it, expect } from "vitest";
import { slugify } from "../../src/utils/slugify";

describe("slugify", () => {
  it("lowercases the input", () => {
    expect(slugify("Hello World")).toBe("hello-world");
  });

  it("replaces spaces with hyphens", () => {
    expect(slugify("ink cartridge")).toBe("ink-cartridge");
  });

  it("strips special characters that are not word chars, spaces or hyphens", () => {
    expect(slugify("HP 305XL (Black)")).toBe("hp-305xl-black");
  });

  it("collapses multiple spaces/hyphens/underscores into a single hyphen", () => {
    expect(slugify("Canon  PG-540  XL")).toBe("canon-pg-540-xl");
  });

  it("trims leading and trailing hyphens", () => {
    expect(slugify("  -Hello-  ")).toBe("hello");
  });

  it("returns an empty string for an all-special-char input", () => {
    expect(slugify("!!!???")).toBe("");
  });

  it("handles already-slugified strings unchanged", () => {
    expect(slugify("epson-t0711-black")).toBe("epson-t0711-black");
  });

  it("handles numbers", () => {
    expect(slugify("Canon 305")).toBe("canon-305");
  });

  it("handles an empty string", () => {
    expect(slugify("")).toBe("");
  });

  it("handles a single word with no special chars", () => {
    expect(slugify("Brother")).toBe("brother");
  });
});
