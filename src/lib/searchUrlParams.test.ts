import { describe, expect, it } from "vitest";
import {
  SEARCH_PRICE_MAX_DEFAULT,
  SEARCH_PRICE_MIN_DEFAULT,
  SEARCH_SORT_DEFAULT,
  applySearchFiltersToParams,
  parseSearchPriceParam,
  parseSearchUrlParams,
  searchPathForCategoryId,
} from "./searchUrlParams";

describe("parseSearchPriceParam", () => {
  it("parses valid non-negative numbers", () => {
    expect(parseSearchPriceParam("100")).toBe(100);
    expect(parseSearchPriceParam("0")).toBe(0);
    expect(parseSearchPriceParam(" 12.5 ")).toBe(12.5);
  });

  it("rejects empty and invalid values", () => {
    expect(parseSearchPriceParam(null)).toBeUndefined();
    expect(parseSearchPriceParam("")).toBeUndefined();
    expect(parseSearchPriceParam("  ")).toBeUndefined();
    expect(parseSearchPriceParam("abc")).toBeUndefined();
    expect(parseSearchPriceParam("-5")).toBeUndefined();
  });
});

describe("parseSearchUrlParams", () => {
  it("reads supported parameters", () => {
    const params = new URLSearchParams(
      "q=phone&categoryId=cat-1&condition=new&location=Tirana&priceMin=50&priceMax=900&sortBy=price-low&utm=keep",
    );
    expect(parseSearchUrlParams(params)).toEqual({
      query: "phone",
      categoryId: "cat-1",
      condition: "new",
      location: "Tirana",
      priceMin: 50,
      priceMax: 900,
      sortBy: "price-low",
    });
  });

  it("ignores invalid condition and sortBy", () => {
    const params = new URLSearchParams("condition=mint&sortBy=popular");
    const parsed = parseSearchUrlParams(params);
    expect(parsed.condition).toBe("");
    expect(parsed.sortBy).toBe(SEARCH_SORT_DEFAULT);
  });

  it("treats empty values as unset defaults", () => {
    const params = new URLSearchParams("q=&categoryId=&condition=&location=&priceMin=&priceMax=&sortBy=");
    expect(parseSearchUrlParams(params)).toEqual({
      query: "",
      categoryId: "",
      condition: "",
      location: "",
      priceMin: SEARCH_PRICE_MIN_DEFAULT,
      priceMax: SEARCH_PRICE_MAX_DEFAULT,
      sortBy: SEARCH_SORT_DEFAULT,
    });
  });

  it("swaps inverted price range", () => {
    const parsed = parseSearchUrlParams(new URLSearchParams("priceMin=500&priceMax=100"));
    expect(parsed.priceMin).toBe(100);
    expect(parsed.priceMax).toBe(500);
  });
});

describe("applySearchFiltersToParams", () => {
  it("writes filters and preserves unrelated params", () => {
    const current = new URLSearchParams("utm_source=ads&ref=nav");
    const next = applySearchFiltersToParams(current, {
      query: "bike",
      categoryId: "c-9",
      condition: "used",
      location: "Durrës",
      priceMin: 10,
      priceMax: 2000,
      sortBy: "newest",
    });
    expect(next.get("utm_source")).toBe("ads");
    expect(next.get("ref")).toBe("nav");
    expect(next.get("q")).toBe("bike");
    expect(next.get("categoryId")).toBe("c-9");
    expect(next.get("condition")).toBe("used");
    expect(next.get("location")).toBe("Durrës");
    expect(next.get("priceMin")).toBe("10");
    expect(next.get("priceMax")).toBe("2000");
    expect(next.get("sortBy")).toBe("newest");
  });

  it("omits empty and default filter values", () => {
    const next = applySearchFiltersToParams(new URLSearchParams("q=old&foo=1"), {
      query: "",
      categoryId: "",
      condition: "",
      location: "",
      priceMin: SEARCH_PRICE_MIN_DEFAULT,
      priceMax: SEARCH_PRICE_MAX_DEFAULT,
      sortBy: SEARCH_SORT_DEFAULT,
    });
    expect(next.get("q")).toBeNull();
    expect(next.get("categoryId")).toBeNull();
    expect(next.get("sortBy")).toBeNull();
    expect(next.get("foo")).toBe("1");
  });

  it("does not invent a second category key", () => {
    const next = applySearchFiltersToParams(new URLSearchParams("category=watches"), {
      query: "",
      categoryId: "uuid-1",
      condition: "",
      location: "",
      priceMin: 0,
      priceMax: SEARCH_PRICE_MAX_DEFAULT,
      sortBy: SEARCH_SORT_DEFAULT,
    });
    expect(next.get("categoryId")).toBe("uuid-1");
    expect(next.get("category")).toBe("watches");
  });
});

describe("searchPathForCategoryId", () => {
  it("builds SearchResults-compatible categoryId links", () => {
    expect(searchPathForCategoryId("abc-123")).toBe("/search?categoryId=abc-123");
    expect(searchPathForCategoryId("  ")).toBe("/search");
    expect(searchPathForCategoryId(null)).toBe("/search");
  });
});
