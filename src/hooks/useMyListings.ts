import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useMyListings = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["my-listings", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<Array<{
      id: string; title: string; price: number; image_urls: string[]; seller_id: string;
      category: string; description: string; condition: string; status: string; vertical: string;
      created_at: string; currency: string; country: string | null; city: string | null;
      contact_method: string; listing_type: string; is_boosted: boolean;
      boost_expires_at: string | null; expires_at: string | null; auto_renew: boolean;
      moderation_status: string; brand: string | null;
    }>> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("seller_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useDeleteListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", productId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Artikulli u fshi me sukses");
    },
    onError: () => {
      toast.error("Dështoi fshirja e artikullit");
    },
  });
};

export const useUpdateListing = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: { title?: string; description?: string; price?: number; category?: string; condition?: string; status?: string };
    }) => {
      const { error } = await supabase
        .from("products")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
      toast.success("Artikulli u përditësua me sukses");
    },
    onError: () => {
      toast.error("Dështoi përditësimi i artikullit");
    },
  });
};
