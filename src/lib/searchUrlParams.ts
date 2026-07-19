/** Search listing URL query keys (single convention). */
export const SEARCH_URL_KEYS = [
  "q",
  "categoryId",
  "condition",
  "location",
  "priceMin",
  "priceMax",
  "sortBy",
] as const;

export type SearchUrlKey = (typeof SEARCH_URL_KEYS)[number];

export const SEARCH_PRICE_MIN_DEFAULT = 0;
export const SEARCH_PRICE_MAX_DEFAULT = 100000;

export const SEARCH_SORT_OPTIONS = [
  "newest",
  "oldest",
  "price-low",
  "price-high",
  "relevance",
] as const;

export type SearchSortOption = (typeof SEARCH_SORT_OPTIONS)[number];

export const SEARCH_CONDITION_OPTIONS = ["new", "like-new", "good", "used"] as const;

export type SearchConditionOption = (typeof SEARCH_CONDITION_OPTIONS)[number];

export const SEARCH_SORT_DEFAULT: SearchSortOption = "relevance";

export type SearchUrlState = {
  query: string;
  categoryId: string;
  condition: string;
  location: string;
  priceMin: number;
  priceMax: number;
  sortBy: SearchSortOption;
};

const SORT_SET = new Set<string>(SEARCH_SORT_OPTIONS);
const CONDITION_SET = new Set<string>(SEARCH_CONDITION_OPTIONS);

/** Parse a non-negative finite price; empty/invalid → undefined. */
export function parseSearchPriceParam(raw: string | null): number | undefined {
  if (raw == null) return undefined;
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || n < 0) return undefined;
  return n;
}

function parseSort(raw: string | null): SearchSortOption {
  if (!raw || !raw.trim()) return SEARCH_SORT_DEFAULT;
  const v = raw.trim();
  return SORT_SET.has(v) ? (v as SearchSortOption) : SEARCH_SORT_DEFAULT;
}

function parseCondition(raw: string | null): string {
  if (!raw || !raw.trim()) return "";
  const v = raw.trim();
  return CONDITION_SET.has(v) ? v : "";
}

/** Read supported search filters from URLSearchParams (invalid values ignored). */
export function parseSearchUrlParams(params: URLSearchParams): SearchUrlState {
  let priceMin = parseSearchPriceParam(params.get("priceMin")) ?? SEARCH_PRICE_MIN_DEFAULT;
  let priceMax = parseSearchPriceParam(params.get("priceMax")) ?? SEARCH_PRICE_MAX_DEFAULT;
  if (priceMin > priceMax) {
    const tmp = priceMin;
    priceMin = priceMax;
    priceMax = tmp;
  }

  const categoryId = (params.get("categoryId") ?? "").trim();
  const location = (params.get("location") ?? "").trim();
  const query = (params.get("q") ?? "").trim();

  return {
    query,
    categoryId,
    condition: parseCondition(params.get("condition")),
    location,
    priceMin,
    priceMax,
    sortBy: parseSort(params.get("sortBy")),
  };
}

export type SearchUrlWriteInput = {
  query: string;
  categoryId: string;
  condition: string;
  location: string;
  priceMin: number;
  priceMax: number;
  sortBy: SearchSortOption;
};

/**
 * Merge filter state into params: updates known keys, preserves unrelated keys,
 * omits empty / default values.
 */
export function applySearchFiltersToParams(
  current: URLSearchParams,
  filters: SearchUrlWriteInput,
): URLSearchParams {
  const next = new URLSearchParams(current.toString());
  for (const key of SEARCH_URL_KEYS) {
    next.delete(key);
  }

  const q = filters.query.trim();
  if (q) next.set("q", q);

  const categoryId = filters.categoryId.trim();
  if (categoryId) next.set("categoryId", categoryId);

  const condition = filters.condition.trim();
  if (condition && CONDITION_SET.has(condition)) next.set("condition", condition);

  const location = filters.location.trim();
  if (location) next.set("location", location);

  if (filters.priceMin > SEARCH_PRICE_MIN_DEFAULT) {
    next.set("priceMin", String(filters.priceMin));
  }
  if (filters.priceMax < SEARCH_PRICE_MAX_DEFAULT) {
    next.set("priceMax", String(filters.priceMax));
  }

  if (filters.sortBy && filters.sortBy !== SEARCH_SORT_DEFAULT && SORT_SET.has(filters.sortBy)) {
    next.set("sortBy", filters.sortBy);
  }

  return next;
}

/** ProductDetail “View all” → SearchResults category filter (UUID). */
export function searchPathForCategoryId(categoryId: string | null | undefined): string {
  const id = (categoryId ?? "").trim();
  if (!id) return "/search";
  return `/search?categoryId=${encodeURIComponent(id)}`;
}
