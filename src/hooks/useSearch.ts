import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProductWithSeller } from "@/hooks/useProducts";

export const SEARCH_PAGE_SIZE = 50;

export interface SearchFilters {
  query?: string;
  categoryId?: string;
  vertical?: string;
  condition?: string;
  priceMin?: number;
  priceMax?: number;
  location?: string;
  sortBy?: "newest" | "oldest" | "price-low" | "price-high" | "relevance";
  limit?: number;
  offset?: number;
}

/** Filter fields that identify a search (excludes pagination). */
export type SearchFilterKey = Omit<SearchFilters, "limit" | "offset">;

// Lightweight session id for anonymous tracking
const getSessionId = () => {
  if (typeof window === "undefined") return "ssr";
  let sid = localStorage.getItem("shpalljet_sid");
  if (!sid) { sid = crypto.randomUUID(); localStorage.setItem("shpalljet_sid", sid); }
  return sid;
};

const logSearchEvent = async (filters: SearchFilters, resultsCount: number) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    await (supabase as any).from("search_events").insert({
      user_id: user?.id ?? null,
      session_id: getSessionId(),
      query: filters.query ?? "",
      parsed_keywords: (filters.query ?? "").trim().split(/\s+/).filter(Boolean),
      parsed_category: filters.categoryId ?? null,
      parsed_price_min: filters.priceMin ?? null,
      parsed_price_max: filters.priceMax ?? null,
      parsed_condition: filters.condition ?? null,
      parsed_location: filters.location ?? null,
      results_count: resultsCount,
    });
  } catch { /* non-blocking */ }
};

export function isSearchEnabled(filters: SearchFilterKey): boolean {
  const query = filters.query ?? "";
  const location = (filters.location ?? "").trim();
  return (
    query.length >= 2 ||
    !!filters.categoryId ||
    !!filters.vertical ||
    !!filters.condition ||
    !!location ||
    filters.priceMin != null ||
    filters.priceMax != null
  );
}

/** Stable query-key slice (no limit/offset) so page loads share one infinite cache. */
export function searchProductsQueryKey(filters: SearchFilterKey) {
  return [
    "search-products",
    {
      query: filters.query ?? "",
      categoryId: filters.categoryId,
      vertical: filters.vertical,
      condition: filters.condition,
      priceMin: filters.priceMin,
      priceMax: filters.priceMax,
      location: filters.location,
      sortBy: filters.sortBy ?? "newest",
    },
  ] as const;
}

/** Deduplicate by stable product UUID, preserving first-seen order. */
export function dedupeProductsById<T extends { id: string }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    out.push(item);
  }
  return out;
}

/** Next offset, or undefined when the last page was short (no more results). */
export function getSearchNextOffset(
  lastPage: { length: number },
  allPages: { length: number }[],
  pageSize: number = SEARCH_PAGE_SIZE,
): number | undefined {
  if (lastPage.length < pageSize) return undefined;
  return allPages.reduce((sum, page) => sum + page.length, 0);
}

export async function fetchSearchProducts(filters: SearchFilters): Promise<ProductWithSeller[]> {
  const {
    query = "",
    categoryId,
    vertical,
    condition,
    priceMin,
    priceMax,
    location,
    sortBy = "newest",
    limit = SEARCH_PAGE_SIZE,
    offset = 0,
  } = filters;

  const useRank = sortBy === "relevance" || sortBy === "newest";
  let data: any[] | null = null;
  let error: any = null;

  if (useRank) {
    const r = await (supabase as any).rpc("rank_products", {
      search_query: query,
      filter_category_id: categoryId || null,
      filter_vertical: vertical || null,
      filter_condition: condition || null,
      filter_price_min: priceMin ?? null,
      filter_price_max: priceMax ?? null,
      filter_location: location || null,
      result_limit: limit,
      result_offset: offset,
    });
    data = r.data as any[];
    error = r.error;
  }

  if (!useRank || error) {
    const r = await supabase.rpc("search_products", {
      search_query: query,
      filter_category_id: categoryId || null,
      filter_vertical: vertical || null,
      filter_condition: condition || null,
      filter_price_min: priceMin ?? null,
      filter_price_max: priceMax ?? null,
      filter_location: location || null,
      sort_by: sortBy,
      result_limit: limit,
      result_offset: offset,
    });
    data = r.data as any[];
    error = r.error;
  }

  if (error) throw error;

  const products = (data as any[]) ?? [];
  logSearchEvent(filters, products.length);
  const sellerIds = [...new Set(products.map((p) => p.seller_id))];
  if (sellerIds.length === 0) return [];

  const { data: profiles } = await supabase
    .from("profiles")
    .select("user_id, display_name, avatar_url")
    .in("user_id", sellerIds);

  const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

  const results = products.map((p) => ({
    ...p,
    seller: profileMap.get(p.seller_id) ?? undefined,
  }));

  return results.sort((a: any, b: any) => {
    const aBoosted = a.is_boosted && a.boost_expires_at && new Date(a.boost_expires_at) > new Date();
    const bBoosted = b.is_boosted && b.boost_expires_at && new Date(b.boost_expires_at) > new Date();
    if (aBoosted && !bBoosted) return -1;
    if (!aBoosted && bBoosted) return 1;
    return 0;
  });
}

export const useSearchProducts = (filters: SearchFilters) => {
  const { limit = SEARCH_PAGE_SIZE, offset = 0, ...rest } = filters;

  return useQuery({
    queryKey: [...searchProductsQueryKey(rest), { limit, offset }],
    enabled: isSearchEnabled(rest),
    queryFn: () => fetchSearchProducts({ ...rest, limit, offset }),
  });
};

/** Infinite search pages; query key omits offset so filter changes reset accumulation. */
export const useInfiniteSearchProducts = (filters: SearchFilterKey) => {
  return useInfiniteQuery({
    queryKey: searchProductsQueryKey(filters),
    enabled: isSearchEnabled(filters),
    initialPageParam: 0,
    queryFn: ({ pageParam }) =>
      fetchSearchProducts({
        ...filters,
        limit: SEARCH_PAGE_SIZE,
        offset: pageParam,
      }),
    getNextPageParam: (lastPage, allPages) => getSearchNextOffset(lastPage, allPages),
  });
};

// Keep legacy hook for backward compatibility
export const useFullTextSearch = (query: string) => {
  return useSearchProducts({ query, sortBy: "relevance" });
};
