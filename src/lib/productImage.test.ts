import { describe, expect, it } from "vitest";
import { pickFirstValidImageUrl, pickValidImageUrls } from "@/lib/productImage";

describe("pickFirstValidImageUrl", () => {
  it("skips empty strings and picks first https URL", () => {
    expect(
      pickFirstValidImageUrl(["", "  ", "https://cdn.example.com/a.jpg"]),
    ).toBe("https://cdn.example.com/a.jpg");
  });

  it("returns null when no valid URLs", () => {
    expect(pickFirstValidImageUrl(["", null, "ftp://x"])).toBeNull();
  });

  it("uses fallback when list is empty", () => {
    expect(pickFirstValidImageUrl([], "https://fb.test/z.png")).toBe(
      "https://fb.test/z.png",
    );
  });
});

describe("pickValidImageUrls", () => {
  it("filters blanks and caps at five", () => {
    const urls = ["", "https://a/1.jpg", "https://a/2.jpg", "https://a/3.jpg", "https://a/4.jpg", "https://a/5.jpg", "https://a/6.jpg"];
    expect(pickValidImageUrls(urls)).toHaveLength(5);
  });

  it("falls back to single image field", () => {
    expect(pickValidImageUrls([], "https://single.test/x.jpg")).toEqual([
      "https://single.test/x.jpg",
    ]);
  });
});
