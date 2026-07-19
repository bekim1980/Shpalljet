import { describe, expect, it } from "vitest";
import {
  SEARCH_PAGE_SIZE,
  dedupeProductsById,
  getSearchNextOffset,
  isSearchEnabled,
  searchProductsQueryKey,
} from "@/hooks/useSearch";

describe("dedupeProductsById", () => {
  it("keeps first occurrence of each id", () => {
    const items = [
      { id: "a", title: "A1" },
      { id: "b", title: "B" },
      { id: "a", title: "A2" },
      { id: "c", title: "C" },
    ];
    expect(dedupeProductsById(items)).toEqual([
      { id: "a", title: "A1" },
      { id: "b", title: "B" },
      { id: "c", title: "C" },
    ]);
  });

  it("returns empty array for empty input", () => {
    expect(dedupeProductsById([])).toEqual([]);
  });
});

describe("getSearchNextOffset", () => {
  it("returns undefined when last page is short", () => {
    expect(getSearchNextOffset(new Array(10), [new Array(50), new Array(10)])).toBeUndefined();
  });

  it("returns accumulated length when last page is full", () => {
    const page1 = new Array(SEARCH_PAGE_SIZE);
    const page2 = new Array(SEARCH_PAGE_SIZE);
    expect(getSearchNextOffset(page2, [page1, page2])).toBe(SEARCH_PAGE_SIZE * 2);
  });

  it("returns page size after the first full page", () => {
    const page1 = new Array(SEARCH_PAGE_SIZE);
    expect(getSearchNextOffset(page1, [page1])).toBe(SEARCH_PAGE_SIZE);
  });
});

describe("search query helpers", () => {
  it("enables search for short query when filters are present", () => {
    expect(isSearchEnabled({ query: "a" })).toBe(false);
    expect(isSearchEnabled({ query: "ab" })).toBe(true);
    expect(isSearchEnabled({ query: "", categoryId: "cat-1" })).toBe(true);
  });

  it("enables search for location-only filters", () => {
    expect(isSearchEnabled({ query: "", location: "Prishtinë" })).toBe(true);
    expect(isSearchEnabled({ query: "", location: "  Tirana  " })).toBe(true);
  });

  it("does not enable search for whitespace-only location", () => {
    expect(isSearchEnabled({ query: "", location: "" })).toBe(false);
    expect(isSearchEnabled({ query: "", location: "   " })).toBe(false);
    expect(isSearchEnabled({ query: "a", location: "  " })).toBe(false);
  });

  it("omits pagination from the query key so filter changes reset pages", () => {
    const key = searchProductsQueryKey({
      query: "phone",
      sortBy: "relevance",
      categoryId: "c1",
    });
    expect(key[0]).toBe("search-products");
    expect(key[1]).toMatchObject({
      query: "phone",
      sortBy: "relevance",
      categoryId: "c1",
    });
    expect(key[1]).not.toHaveProperty("limit");
    expect(key[1]).not.toHaveProperty("offset");
  });
});
