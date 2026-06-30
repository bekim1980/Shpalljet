import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ProductWithSeller } from "@/hooks/useProducts";

export const useRelatedProducts = (productId: string | undefined, category: string | undefined, limit = 6) => {
  return useQuery({
    queryKey: ["related-products", productId, category],
    enabled: !!productId && !!category,
    queryFn: async (): Promise<ProductWithSeller[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .eq("category", category!)
        .neq("id", productId!)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw error;

      const sellerIds = [...new Set((data ?? []).map((p) => p.seller_id))];
      if (sellerIds.length === 0) return [];

      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", sellerIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

      return (data ?? []).map((p) => ({
        ...p,
        seller: profileMap.get(p.seller_id) ?? undefined,
      }));
    },
    staleTime: 1000 * 60 * 5,
  });
};
