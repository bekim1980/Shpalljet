import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Vertical } from "@/contexts/VerticalContext";

export interface ProductWithSeller {
  id: string;
  title: string;
  price: number;
  image_urls: string[];
  seller_id: string;
  category: string;
  description: string;
  condition: string;
  status: string;
  vertical: string;
  created_at: string;
  currency: string;
  country: string | null;
  city: string | null;
  contact_method: string;
  listing_type: string;
  is_boosted: boolean;
  boost_expires_at: string | null;
  expires_at: string | null;
  auto_renew: boolean;
  seller?: {
    display_name: string | null;
    avatar_url: string | null;
    phone_number?: string | null;
    whatsapp_enabled?: boolean;
    viber_enabled?: boolean;
  };
}

export const useProducts = (vertical?: Vertical) => {
  return useQuery({
    queryKey: ["products", vertical],
    queryFn: async (): Promise<ProductWithSeller[]> => {
      let query = supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (vertical) {
        query = query.eq("vertical", vertical);
      }

      const { data: products, error } = await query;

      if (error) throw error;

      // Fetch seller profiles
      const sellerIds = [...new Set(products.map((p) => p.seller_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", sellerIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

      return products.map((p) => ({
        ...p,
        seller: profileMap.get(p.seller_id) ?? undefined,
      }));
    },
  });
};

export const useProduct = (id: string | undefined) => {
  return useQuery({
    queryKey: ["product", id],
    enabled: !!id,
    queryFn: async (): Promise<ProductWithSeller | null> => {
      if (!id) return null;
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error) return null;

      const { data: profile } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url, phone_number, whatsapp_enabled, viber_enabled")
        .eq("user_id", data.seller_id)
        .single();

      return { ...data, seller: profile ?? undefined };
    },
  });
};

export const categories = [
  "All", "Watches", "Bags", "Books", "Audio", "Photography", "Furniture", "Art", "Jewelry", "Other",
];

export const categoryLabels: Record<string, string> = {
  All: "Të Gjitha",
  Watches: "Orë",
  Bags: "Çanta",
  Books: "Libra",
  Audio: "Audio",
  Photography: "Fotografi",
  Furniture: "Mobilje",
  Art: "Art",
  Jewelry: "Bizhuteri",
  Other: "Tjetër",
};
