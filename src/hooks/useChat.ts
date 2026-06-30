import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import type { RealtimePostgresInsertPayload } from "@supabase/supabase-js";

export interface Conversation {
  id: string;
  product_id: string;
  buyer_id: string;
  seller_id: string;
  updated_at: string;
  other_user: { display_name: string | null } | null;
  last_message?: string;
  unread_count?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  read: boolean;
  created_at: string;
}

export function useConversations() {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("conversations")
      .select("*")
      .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
      .order("updated_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return;
    }

    // Fetch other user profiles and last messages
    const enriched = await Promise.all(
      (data || []).map(async (conv) => {
        const otherUserId = conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id;

        const [profileRes, msgRes, unreadRes] = await Promise.all([
          supabase.from("profiles").select("display_name").eq("user_id", otherUserId).single(),
          supabase.from("messages").select("content").eq("conversation_id", conv.id).order("created_at", { ascending: false }).limit(1).single(),
          supabase.from("messages").select("id", { count: "exact" }).eq("conversation_id", conv.id).eq("read", false).neq("sender_id", user.id),
        ]);

        return {
          ...conv,
          other_user: profileRes.data,
          last_message: msgRes.data?.content,
          unread_count: unreadRes.count ?? 0,
        };
      })
    );

    setConversations(enriched);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  return { conversations, loading, refetch: fetchConversations };
}

export function useMessages(conversationId: string | null) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!conversationId) return;

    const fetchMessages = async () => {
      const { data, error } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      if (error) {
        console.error("Error fetching messages:", error);
        return;
      }

      setMessages(data || []);
      setLoading(false);

      // Mark messages as read
      if (user) {
        await supabase
          .from("messages")
          .update({ read: true })
          .eq("conversation_id", conversationId)
          .neq("sender_id", user.id)
          .eq("read", false);
      }
    };

    fetchMessages();

    // Subscribe to new messages
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload: RealtimePostgresInsertPayload<Message>) => {
          setMessages((prev) => [...prev, payload.new]);

          // Mark as read if not sender
          if (user && payload.new.sender_id !== user.id) {
            supabase
              .from("messages")
              .update({ read: true })
              .eq("id", payload.new.id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, user]);

  const sendMessage = async (content: string) => {
    if (!conversationId || !user) return;

    await supabase.from("messages").insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content,
    });
  };

  return { messages, loading, sendMessage };
}

export interface StartConversationResult {
  conversationId: string;
  isNew: boolean;
}

export function useStartConversation() {
  const { user } = useAuth();

  const startConversation = async (
    productId: string,
    sellerId: string
  ): Promise<StartConversationResult | null> => {
    if (!user) return null;

    // 1. Reuse existing conversation if present
    const { data: existing } = await supabase
      .from("conversations")
      .select("id")
      .eq("product_id", productId)
      .eq("buyer_id", user.id)
      .eq("seller_id", sellerId)
      .maybeSingle();

    if (existing) return { conversationId: existing.id, isNew: false };

    // 2. Try to insert. A unique index protects against races / fast double-clicks.
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        product_id: productId,
        buyer_id: user.id,
        seller_id: sellerId,
      })
      .select("id")
      .single();

    if (error) {
      // 23505 = unique_violation → another concurrent call already created it
      if ((error as { code?: string }).code === "23505") {
        const { data: again } = await supabase
          .from("conversations")
          .select("id")
          .eq("product_id", productId)
          .eq("buyer_id", user.id)
          .eq("seller_id", sellerId)
          .maybeSingle();
        if (again) return { conversationId: again.id, isNew: false };
      }
      console.error("Error creating conversation:", error);
      return null;
    }

    // 3. Only bump engagement when a brand-new conversation is created.
    //    Trigger on product_messages bumps products.messages_count.
    try {
      await (supabase as any).from("product_messages").insert({
        user_id: user.id,
        product_id: productId,
        conversation_id: data.id,
      });
    } catch { /* non-blocking */ }

    return { conversationId: data.id, isNew: true };
  };

  return { startConversation };
}
