import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { assertAccountCanMutate, getMutationErrorMessage } from "@/lib/accountRestriction";
import { toast } from "sonner";
import { track } from "@/lib/analytics";

export const useWishlist = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["wishlist", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Set<string>> => {
      const { data, error } = await supabase
        .from("wishlist")
        .select("product_id")
        .eq("user_id", user!.id);
      if (error) throw error;
      return new Set(data.map((w) => w.product_id));
    },
  });
};

export const useToggleWishlist = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ productId, isWished }: { productId: string; isWished: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      await assertAccountCanMutate(user.id);

      if (isWished) {
        const { error } = await supabase
          .from("wishlist")
          .delete()
          .eq("user_id", user.id)
          .eq("product_id", productId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("wishlist")
          .insert({ user_id: user.id, product_id: productId });
        if (error) throw error;
      }
      track("favorite_toggle", { props: { product_id: productId, action: isWished ? "remove" : "add" } });
    },
    onMutate: async ({ productId, isWished }) => {
      await queryClient.cancelQueries({ queryKey: ["wishlist", user?.id] });
      const previous = queryClient.getQueryData<Set<string>>(["wishlist", user?.id]);
      queryClient.setQueryData<Set<string>>(["wishlist", user?.id], (old) => {
        const next = new Set(old);
        isWished ? next.delete(productId) : next.add(productId);
        return next;
      });
      return { previous };
    },
    onError: (err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["wishlist", user?.id], context.previous);
      }
      toast.error(getMutationErrorMessage(err, "Failed to update wishlist"));
    },
    onSettled: (_data, _err, { productId }) => {
      // Refresh wishlist set + any view that depends on favorites_count / ranking
      queryClient.invalidateQueries({ queryKey: ["wishlist", user?.id] });
      queryClient.invalidateQueries({ queryKey: ["search-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["related-products"] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
    },
  });
};
