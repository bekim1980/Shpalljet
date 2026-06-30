import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const useOrders = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["orders", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;

      // Fetch product titles and other participant profiles
      const productIds = [...new Set((data ?? []).map((o: any) => o.product_id).filter(Boolean))];
      const participantIds = [...new Set((data ?? []).flatMap((o: any) => [o.buyer_id, o.seller_id]))];

      const [productsRes, profilesRes] = await Promise.all([
        productIds.length > 0
          ? supabase.from("products").select("id, title, image_urls").in("id", productIds)
          : { data: [] },
        participantIds.length > 0
          ? supabase.from("profiles").select("user_id, display_name, avatar_url").in("user_id", participantIds)
          : { data: [] },
      ]);

      const productMap = new Map((productsRes.data ?? []).map((p: any) => [p.id, p]));
      const profileMap = new Map((profilesRes.data ?? []).map((p: any) => [p.user_id, p]));

      return (data ?? []).map((o: any) => ({
        ...o,
        product: productMap.get(o.product_id),
        buyer_profile: profileMap.get(o.buyer_id),
        seller_profile: profileMap.get(o.seller_id),
        is_buyer: o.buyer_id === user!.id,
      }));
    },
  });
};
