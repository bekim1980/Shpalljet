import { describe, it, expect } from "vitest";
import { getValidSeoImageUrl, buildProductCanonical, DEFAULT_OG_IMAGE } from "@/lib/seoImage";
import { buildProductSlug } from "@/lib/productSlug";

describe("getValidSeoImageUrl", () => {
  it("returns first valid absolute https URL", () => {
    expect(getValidSeoImageUrl(["https://cdn.example.com/a.jpg"])).toBe(
      "https://cdn.example.com/a.jpg",
    );
  });
  it("accepts http://", () => {
    expect(getValidSeoImageUrl(["http://example.com/x.png"])).toBe(
      "http://example.com/x.png",
    );
  });
  it("skips relative/invalid and uses next valid", () => {
    expect(
      getValidSeoImageUrl(["/local.png", "not-a-url", "https://ok.test/y.jpg"]),
    ).toBe("https://ok.test/y.jpg");
  });
  it("falls back when undefined/null/empty/non-array", () => {
    expect(getValidSeoImageUrl(undefined)).toBe(DEFAULT_OG_IMAGE);
    expect(getValidSeoImageUrl(null)).toBe(DEFAULT_OG_IMAGE);
    expect(getValidSeoImageUrl([])).toBe(DEFAULT_OG_IMAGE);
    expect(getValidSeoImageUrl("nope" as unknown)).toBe(DEFAULT_OG_IMAGE);
  });
  it("rejects empty strings, non-strings, ftp", () => {
    expect(getValidSeoImageUrl(["", null, 42, "ftp://x/y"])).toBe(
      DEFAULT_OG_IMAGE,
    );
  });
});

describe("buildProductCanonical", () => {
  it("produces absolute /p/slug-uuid URL", () => {
    const url = buildProductCanonical(
      "iPhone 13 Pro",
      "11111111-2222-3333-4444-555555555555",
      buildProductSlug,
    );
    expect(url).toMatch(/^https:\/\/.+\/p\/iphone-13-pro-11111111/);
    expect(url).not.toContain("undefined");
    expect(url).not.toContain("null");
  });
  it("falls back to /product/:id when title is missing", () => {
    const url = buildProductCanonical(
      undefined,
      "11111111-2222-3333-4444-555555555555",
      buildProductSlug,
    );
    expect(url).toMatch(/^https:\/\/.+\/p\//);
    expect(url).not.toContain("undefined");
  });
  it("falls back to root when id is missing", () => {
    const url = buildProductCanonical("Title", undefined, buildProductSlug);
    expect(url).toMatch(/^https:\/\/.+\/$/);
  });
});
