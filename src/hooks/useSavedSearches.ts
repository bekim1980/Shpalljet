import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { assertAccountCanMutate } from "@/lib/accountRestriction";

export interface SavedSearchInput {
  query?: string;
  category_id?: string | null;
  vertical?: string | null;
  condition?: string | null;
  price_min?: number | null;
  price_max?: number | null;
  location?: string | null;
  sort_by?: string | null;
}

export interface SavedSearch extends SavedSearchInput {
  id: string;
  user_id: string;
  is_active: boolean;
  last_checked_at: string;
  created_at: string;
}

const normalize = (i: SavedSearchInput) => ({
  query: (i.query ?? "").trim(),
  category_id: i.category_id ?? null,
  vertical: i.vertical ?? null,
  condition: i.condition ?? null,
  price_min: i.price_min ?? null,
  price_max: i.price_max ?? null,
  location: i.location ?? null,
  sort_by: i.sort_by ?? "relevance",
});

export const useSavedSearches = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["saved-searches", user?.id],
    enabled: !!user,
    queryFn: async (): Promise<SavedSearch[]> => {
      const { data, error } = await (supabase as any)
        .from("saved_searches")
        .select("*")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as SavedSearch[];
    },
  });
};

// Find existing saved search matching the given filters (client-side signature match)
export const useFindSavedSearch = (filters: SavedSearchInput) => {
  const { data: all } = useSavedSearches();
  const sig = JSON.stringify(normalize(filters));
  return all?.find((s) => JSON.stringify(normalize(s)) === sig);
};

export const useCreateSavedSearch = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: SavedSearchInput) => {
      if (!user) throw new Error("Not authenticated");
      await assertAccountCanMutate(user.id);
      const payload = { user_id: user.id, is_active: true, ...normalize(input) };
      const { data, error } = await (supabase as any)
        .from("saved_searches")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data as SavedSearch;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches", user?.id] }),
  });
};

export const useToggleSavedSearch = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      if (!user) throw new Error("Not authenticated");
      await assertAccountCanMutate(user.id);
      const { error } = await (supabase as any)
        .from("saved_searches")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches", user?.id] }),
  });
};

export const useDeleteSavedSearch = () => {
  const { user } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      if (!user) throw new Error("Not authenticated");
      await assertAccountCanMutate(user.id);
      const { error } = await (supabase as any).from("saved_searches").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["saved-searches", user?.id] }),
  });
};
