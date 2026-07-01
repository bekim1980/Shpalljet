import { describe, expect, it } from "vitest";
import {
  buildProductImageSrcSet,
  isPipelineImageUrl,
  pickFirstValidImageUrl,
  pickValidImageUrls,
  resolveProductImageUrl,
} from "@/lib/productImage";
import {
  AI_JPEG_QUALITY,
  IMAGE_VARIANT_MAX,
  LOW_QUALITY_THRESHOLD_PX,
} from "@/lib/productImagePipeline";

const PIPELINE_BASE =
  "https://example.supabase.co/storage/v1/object/public/product-images/user-1/abc-123/listing.webp";

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

  it("resolves pipeline URLs to requested size", () => {
    expect(pickFirstValidImageUrl([PIPELINE_BASE], null, "thumb")).toBe(
      PIPELINE_BASE.replace("/listing.webp", "/thumb.webp"),
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

describe("resolveProductImageUrl", () => {
  it("swaps pipeline variant segments", () => {
    expect(resolveProductImageUrl(PIPELINE_BASE, "card")).toBe(
      "https://example.supabase.co/storage/v1/object/public/product-images/user-1/abc-123/card.webp",
    );
    expect(resolveProductImageUrl(PIPELINE_BASE, "large")).toContain("/large.webp");
  });

  it("returns legacy single JPEG unchanged for all sizes", () => {
    const legacy = "https://cdn.test/user/photo.jpg";
    expect(resolveProductImageUrl(legacy, "thumb")).toBe(legacy);
    expect(resolveProductImageUrl(legacy, "large")).toBe(legacy);
  });
});

describe("isPipelineImageUrl", () => {
  it("detects multi-variant storage layout", () => {
    expect(isPipelineImageUrl(PIPELINE_BASE)).toBe(true);
    expect(isPipelineImageUrl("https://cdn.test/user/photo.jpg")).toBe(false);
  });
});

describe("buildProductImageSrcSet", () => {
  it("builds width descriptors for pipeline images", () => {
    const srcSet = buildProductImageSrcSet(PIPELINE_BASE);
    expect(srcSet).toContain("320w");
    expect(srcSet).toContain("640w");
    expect(srcSet).toContain("1280w");
    expect(srcSet).toContain("1920w");
  });

  it("returns undefined for legacy URLs", () => {
    expect(buildProductImageSrcSet("https://cdn.test/user/photo.jpg")).toBeUndefined();
  });
});

describe("productImagePipeline constants", () => {
  it("defines expected variant sizes and AI quality", () => {
    expect(IMAGE_VARIANT_MAX.thumb).toBe(320);
    expect(IMAGE_VARIANT_MAX.card).toBe(640);
    expect(IMAGE_VARIANT_MAX.listing).toBe(1280);
    expect(IMAGE_VARIANT_MAX.large).toBe(1920);
    expect(IMAGE_VARIANT_MAX.ai).toBe(1280);
    expect(AI_JPEG_QUALITY).toBe(0.82);
    expect(LOW_QUALITY_THRESHOLD_PX).toBe(500);
  });
});
