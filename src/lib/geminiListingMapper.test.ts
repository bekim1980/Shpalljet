import { describe, expect, it } from "vitest";
import { applyGeminiListingToDraft, geminiListingToAnalysis } from "./geminiListingMapper";
import type { GeminiListingResult } from "./geminiListingSchema";

const sample: GeminiListingResult = {
  seo_title: "iPhone 13 Pro",
  marketplace_title: "Apple iPhone 13 Pro 128GB",
  category: "electronics",
  subcategory: "phones",
  brand: "Apple",
  model: "iPhone 13 Pro",
  condition: "like-new",
  color: "graphite",
  description: "Barely used iPhone 13 Pro with box.",
  features: ["128GB", "Face ID"],
  keywords: ["iphone", "apple"],
  tags: ["smartphone"],
  url_slug: "apple-iphone-13-pro",
  meta_title: "iPhone 13 Pro for Sale",
  meta_description: "Like-new iPhone 13 Pro available.",
  image_alt_text: "Graphite iPhone 13 Pro",
  price_estimate: "650 EUR",
};

describe("applyGeminiListingToDraft", () => {
  it("maps listing fields to draft", () => {
    const draft = applyGeminiListingToDraft(sample, "cat-123");
    expect(draft.title).toBe(sample.marketplace_title);
    expect(draft.brand).toBe("Apple");
    expect(draft.condition).toBe("like-new");
    expect(draft.price).toBe("650");
    expect(draft.categoryId).toBe("cat-123");
    expect(draft.description).toContain(sample.description);
  });

  it("skips Unknown brand", () => {
    const draft = applyGeminiListingToDraft({ ...sample, brand: "Unknown" }, "");
    expect(draft.brand).toBe("");
  });
});

describe("geminiListingToAnalysis", () => {
  it("bridges to AiListingAnalysis shape", () => {
    const analysis = geminiListingToAnalysis(sample);
    expect(analysis.title).toBe(sample.marketplace_title);
    expect(analysis.brand).toBe("Apple");
    expect(analysis.tags).toContain("iphone");
    expect(analysis.attributes.some((a) => a.key === "color")).toBe(true);
  });
});
