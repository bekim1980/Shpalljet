import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProductWithSeller } from "@/hooks/useProducts";

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

export const useSearchProducts = (filters: SearchFilters) => {
  const { query = "", categoryId, vertical, condition, priceMin, priceMax, location, sortBy = "newest", limit = 50, offset = 0 } = filters;

  return useQuery({
    queryKey: ["search-products", filters],
    enabled: query.length >= 2 || !!categoryId || !!vertical || !!condition || priceMin != null || priceMax != null,
    queryFn: async (): Promise<ProductWithSeller[]> => {
      // Use ranked RPC for relevance/newest; fall back to legacy for explicit price/oldest sorts
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
        data = r.data as any[]; error = r.error;
      }

      // Fallback to legacy search_products if ranking fails OR for non-rank sort modes
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
        data = r.data as any[]; error = r.error;
      }

      if (error) throw error;

      // Fetch seller profiles
      const products = (data as any[]) ?? [];
      // Fire-and-forget analytics log
      logSearchEvent(filters, products.length);
      const sellerIds = [...new Set(products.map((p) => p.seller_id))];
      if (sellerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", sellerIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

      // Sort boosted listings to top
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
    },
  });
};

// Keep legacy hook for backward compatibility
export const useFullTextSearch = (query: string) => {
  return useSearchProducts({ query, sortBy: "relevance" });
};
