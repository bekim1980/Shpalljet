import { useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const messageUnreadCountQueryKey = (userId: string) =>
  ["message-unread-count", userId] as const;

export const useUnreadMessageCount = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: messageUnreadCountQueryKey(user?.id ?? ""),
    enabled: !!user,
    queryFn: async (): Promise<number> => {
      const { data: conversations, error: convError } = await supabase
        .from("conversations")
        .select("id")
        .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`);

      if (convError) throw convError;
      const ids = (conversations ?? []).map((c) => c.id);
      if (ids.length === 0) return 0;

      const { count, error } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", ids)
        .eq("read", false)
        .neq("sender_id", user!.id);

      if (error) throw error;
      return count ?? 0;
    },
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`message-unread:${user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        () => {
          queryClient.invalidateQueries({
            queryKey: messageUnreadCountQueryKey(user.id),
          });
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "messages" },
        () => {
          queryClient.invalidateQueries({
            queryKey: messageUnreadCountQueryKey(user.id),
          });
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user, queryClient]);

  return {
    unreadCount: query.data ?? 0,
    isLoading: query.isLoading,
  };
};
