import { describe, expect, it } from "vitest";
import {
  buildCategoryAttributePromptGuide,
  getAttributeKeysForCategory,
  sanitizeCategoryAttributes,
} from "./categoryAttributeKeys";

describe("getAttributeKeysForCategory", () => {
  it("returns phone keys for electronics-phones", () => {
    expect(getAttributeKeysForCategory("electronics", "electronics-phones")).toEqual([
      "brand",
      "model",
      "storage",
      "ram",
      "color",
      "condition",
    ]);
  });

  it("returns vehicle keys for vehicles-cars", () => {
    expect(getAttributeKeysForCategory("vehicles", "vehicles-cars")).toContain("mileage");
    expect(getAttributeKeysForCategory("vehicles", "vehicles-cars")).toContain("fuel_type");
  });

  it("falls back to category keys when subcategory is empty", () => {
    expect(getAttributeKeysForCategory("furniture", "")).toEqual([
      "type",
      "material",
      "color",
      "dimensions",
      "condition",
    ]);
  });
});

describe("sanitizeCategoryAttributes", () => {
  it("keeps only allowed non-empty keys", () => {
    const result = sanitizeCategoryAttributes(
      {
        storage: "256 GB",
        color: "E zezë",
        invented: "nope",
        ram: "",
        condition: "Unknown",
      },
      "electronics",
      "electronics-phones",
    );
    expect(result).toEqual({ storage: "256 GB", color: "E zezë" });
  });
});

describe("buildCategoryAttributePromptGuide", () => {
  it("includes known subcategory keys from verticalConfig", () => {
    const guide = buildCategoryAttributePromptGuide();
    expect(guide).toContain("electronics-phones:");
    expect(guide).toContain("storage");
    expect(guide).toContain("vehicles-cars:");
    expect(guide).toContain("mileage");
  });
});
