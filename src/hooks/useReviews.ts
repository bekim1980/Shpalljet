import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Review {
  id: string;
  reviewer_id: string;
  seller_id: string;
  product_id: string;
  rating: number;
  comment: string;
  created_at: string;
  reviewer?: { display_name: string | null; avatar_url: string | null };
}

export const useSellerReviews = (sellerId: string | undefined) => {
  return useQuery({
    queryKey: ["reviews", sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<Review[]> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("*")
        .eq("seller_id", sellerId!)
        .order("created_at", { ascending: false });
      if (error) throw error;

      const reviewerIds = [...new Set(data.map((r) => r.reviewer_id))];
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name, avatar_url")
        .in("user_id", reviewerIds);

      const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) ?? []);

      return data.map((r) => ({
        ...r,
        reviewer: profileMap.get(r.reviewer_id) ?? undefined,
      }));
    },
  });
};

export const useSellerRating = (sellerId: string | undefined) => {
  return useQuery({
    queryKey: ["seller-rating", sellerId],
    enabled: !!sellerId,
    queryFn: async (): Promise<{ average: number; count: number }> => {
      const { data, error } = await supabase
        .from("reviews")
        .select("rating")
        .eq("seller_id", sellerId!);
      if (error) throw error;
      if (!data.length) return { average: 0, count: 0 };
      const sum = data.reduce((acc, r) => acc + r.rating, 0);
      return { average: Math.round((sum / data.length) * 10) / 10, count: data.length };
    },
  });
};

export const useCreateReview = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      sellerId,
      productId,
      rating,
      comment,
    }: {
      sellerId: string;
      productId: string;
      rating: number;
      comment: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("reviews").insert({
        reviewer_id: user.id,
        seller_id: sellerId,
        product_id: productId,
        rating,
        comment,
      });
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["reviews", variables.sellerId] });
      queryClient.invalidateQueries({ queryKey: ["seller-rating", variables.sellerId] });
      toast.success("Vlerësimi u dërgua me sukses!");
    },
    onError: () => {
      toast.error("Dështoi dërgimi i vlerësimit");
    },
  });
};
