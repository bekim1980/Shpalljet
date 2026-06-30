import { useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

/** Track a view on product detail page (fires once per session per product) */
export const useTrackProductView = (productId: string | undefined) => {
  const { user } = useAuth();

  useEffect(() => {
    if (!productId) return;
    const key = `viewed_${productId}`;
    if (sessionStorage.getItem(key)) return;
    sessionStorage.setItem(key, "1");

    supabase.from("product_views").insert({
      product_id: productId,
      viewer_id: user?.id ?? null,
    } as any);
  }, [productId, user?.id]);
};

/** Get view count for a single product (seller use) */
export const useProductViewCount = (productId: string | undefined) => {
  return useQuery({
    queryKey: ["product-views", productId],
    enabled: !!productId,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("product_views")
        .select("*", { count: "exact", head: true })
        .eq("product_id", productId!);
      if (error) throw error;
      return count ?? 0;
    },
  });
};

/** Get total views across all seller's products */
export const useSellerTotalViews = (userId: string | undefined) => {
  return useQuery({
    queryKey: ["seller-total-views", userId],
    enabled: !!userId,
    queryFn: async () => {
      // Get all seller's product IDs first, then count views
      const { data: products, error: pErr } = await supabase
        .from("products")
        .select("id")
        .eq("seller_id", userId!);
      if (pErr) throw pErr;
      if (!products?.length) return 0;

      const { count, error } = await supabase
        .from("product_views")
        .select("*", { count: "exact", head: true })
        .in("product_id", products.map(p => p.id));
      if (error) throw error;
      return count ?? 0;
    },
  });
};
