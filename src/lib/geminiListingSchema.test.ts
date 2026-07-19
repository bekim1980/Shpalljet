import { describe, expect, it } from "vitest";
import { parseGeminiListingJson } from "./geminiListingSchema";

const validListing = {
  seo_title: "Vintage Leather Jacket",
  marketplace_title: "Brown Vintage Leather Jacket — Size M",
  category: "fashion",
  subcategory: "jackets",
  brand: "Unknown",
  model: "Unknown",
  condition: "good",
  color: "brown",
  description: "Classic brown leather jacket in good condition.",
  features: ["genuine leather", "zip closure"],
  keywords: ["leather jacket", "vintage"],
  tags: ["jacket", "brown"],
  url_slug: "vintage-leather-jacket-brown",
  meta_title: "Vintage Brown Leather Jacket for Sale",
  meta_description: "Buy a vintage brown leather jacket in good condition.",
  image_alt_text: "Brown vintage leather jacket on hanger",
  price_estimate: "80-120 EUR",
};

describe("parseGeminiListingJson", () => {
  it("parses a valid object", () => {
    const result = parseGeminiListingJson(validListing);
    expect(result.marketplace_title).toBe(validListing.marketplace_title);
    expect(result.features).toEqual(["genuine leather", "zip closure"]);
  });

  it("parses JSON wrapped in markdown fences", () => {
    const raw = "```json\n" + JSON.stringify(validListing) + "\n```";
    const result = parseGeminiListingJson(raw);
    expect(result.seo_title).toBe(validListing.seo_title);
  });

  it("coerces missing strings to Unknown", () => {
    const result = parseGeminiListingJson({ ...validListing, brand: null });
    expect(result.brand).toBe("Unknown");
  });

  it("parses comma-separated keywords string", () => {
    const result = parseGeminiListingJson({
      ...validListing,
      keywords: "leather, vintage, jacket",
    });
    expect(result.keywords).toEqual(["leather", "vintage", "jacket"]);
  });

  it("defaults missing attributes to empty object", () => {
    const result = parseGeminiListingJson(validListing);
    expect(result.attributes).toEqual({});
  });

  it("parses attributes object map", () => {
    const result = parseGeminiListingJson({
      ...validListing,
      attributes: { size: "M", color: "E kaftë", invent: "x", empty: "" },
    });
    expect(result.attributes).toEqual({ size: "M", color: "E kaftë", invent: "x" });
  });

  it("parses attributes as key/value array", () => {
    const result = parseGeminiListingJson({
      ...validListing,
      attributes: [
        { key: "storage", value: "256 GB" },
        { key: "color", value: "Unknown" },
        { key: "", value: "skip" },
      ],
    });
    expect(result.attributes).toEqual({ storage: "256 GB" });
  });
});
