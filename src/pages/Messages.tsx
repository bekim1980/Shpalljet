import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { useConversations, useMessages, type Conversation } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import Header from "@/components/Header";
import { formatDistanceToNow } from "date-fns";
import { sq, enUS } from "date-fns/locale";

// ─── Messages (page) ─────────────────────────────────────────────────────────

const Messages = () => {
  // ALL hooks unconditionally at the top — no early returns before this block
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  const [searchParams] = useSearchParams();
  const conversationParam = searchParams.get("conversation");
  const { conversations, loading: convsLoading, refetch } = useConversations();
  const [activeConversation, setActiveConversation] = useState<string | null>(conversationParam);

  useEffect(() => {
    if (conversationParam) setActiveConversation(conversationParam);
  }, [conversationParam]);

  // Derived value — not a hook, safe to compute after hooks
  const dateLocale = i18n.language?.startsWith("en") ? enUS : sq;

  // Conditional rendering — in JSX only, after all hooks have run
  if (authLoading) return null;

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center space-y-4">
          <p className="text-muted-foreground font-display text-lg">{t("messages.loginRequired")}</p>
          <Button variant="gold" onClick={() => navigate("/login", { state: { from: "/messages" } })}>
            {t("common.login")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        {/* Conversation list */}
        <div className={`w-full md:w-80 border-r border-border/50 flex flex-col ${activeConversation ? "hidden md:flex" : "flex"}`}>
          <div className="p-4 border-b border-border/50">
            <h2 className="font-display text-lg font-semibold">{t("messages.title")}</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            {convsLoading ? (
              <div className="p-4 text-center text-muted-foreground text-sm">{t("common.loading")}</div>
            ) : conversations.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-sm">{t("messages.noConversations")}</div>
            ) : (
              conversations.map((conv) => (
                <ConversationItem
                  key={conv.id}
                  conversation={conv}
                  isActive={activeConversation === conv.id}
                  currentUserId={user.id}
                  onClick={() => setActiveConversation(conv.id)}
                />
              ))
            )}
          </div>
        </div>

        {/* Thread panel */}
        <div className={`flex-1 flex flex-col ${!activeConversation ? "hidden md:flex" : "flex"}`}>
          {activeConversation ? (
            <MessageThread
              conversationId={activeConversation}
              conversations={conversations}
              convsLoading={convsLoading}
              currentUserId={user.id}
              onBack={() => setActiveConversation(null)}
              onMessageSent={refetch}
              dateLocale={dateLocale}
            />
          ) : (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              <p className="font-display">{t("messages.selectConversation")}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── ConversationItem ─────────────────────────────────────────────────────────

function ConversationItem({
  conversation,
  isActive,
  currentUserId,
  onClick,
}: {
  conversation: Conversation;
  isActive: boolean;
  currentUserId: string;
  onClick: () => void;
}) {
  const { t } = useTranslation();
  const displayName = conversation.other_user?.display_name || t("common.user");

  return (
    <button
      onClick={onClick}
      className={`w-full p-4 text-left border-b border-border/30 hover:bg-secondary/50 transition-colors ${isActive ? "bg-secondary/70" : ""}`}
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center shrink-0 font-bold text-sm text-muted-foreground">
          {displayName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className="font-medium text-sm truncate">{displayName}</span>
            {(conversation.unread_count ?? 0) > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] flex items-center justify-center font-bold shrink-0">
                {conversation.unread_count}
              </span>
            )}
          </div>
          {conversation.last_message && (
            <p className="text-xs text-muted-foreground truncate mt-0.5">{conversation.last_message}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ─── MessageThread ────────────────────────────────────────────────────────────

function MessageThread({
  conversationId,
  conversations,
  convsLoading,
  currentUserId,
  onBack,
  onMessageSent,
  dateLocale,
}: {
  conversationId: string;
  conversations: Conversation[];
  convsLoading: boolean;
  currentUserId: string;
  onBack: () => void;
  onMessageSent: () => void;
  dateLocale: any;
}) {
  // ── ALL hooks unconditionally at the top ──────────────────────────────────
  const { t } = useTranslation();
  const { messages, loading, sendMessage } = useMessages(conversationId);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [productTitle, setProductTitle] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const prefilledRef = useRef<string | null>(null);

  // Derived — not hooks, computed after hooks
  const conv = conversations.find((c) => c.id === conversationId);
  const prefill = searchParams.get("prefill");

  // Fetch product title once conv resolves
  useEffect(() => {
    if (!conv?.product_id) return;
    supabase
      .from("products")
      .select("title")
      .eq("id", conv.product_id)
      .single()
      .then(({ data }) => setProductTitle(data?.title ?? null));
  }, [conv?.product_id]);

  // Auto-send prefill after conversations have loaded and conv is resolved
  useEffect(() => {
    if (convsLoading || !conv || !prefill) return;
    const key = `${conversationId}:${prefill}`;
    if (prefilledRef.current === key) return;
    prefilledRef.current = key;
    sendMessage(prefill).then(async () => {
      onMessageSent();
      const { track } = await import("@/lib/analytics");
      track("message_sent_success", {
        dedupeKey: `quick:${conversationId}:${prefill}`,
        props: {
          product_id: conv.product_id,
          seller_id: conv.seller_id,
          buyer_id: conv.buyer_id,
          conversation_id: conversationId,
          is_first_message: messages.length === 0,
          source: "quick_message",
        },
      });
      const next = new URLSearchParams(searchParams);
      next.delete("prefill");
      setSearchParams(next, { replace: true });
    });
  }, [convsLoading, prefill, conv, conversationId, sendMessage, onMessageSent, searchParams, setSearchParams, messages.length]);

  // Auto-scroll to latest message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!input.trim() || sending) return;
    setSending(true);
    const msg = input;
    setInput("");
    try {
      await sendMessage(msg);
      onMessageSent();
      if (conv) {
        const { track } = await import("@/lib/analytics");
        track("message_sent_success", {
          props: {
            product_id: conv.product_id,
            seller_id: conv.seller_id,
            buyer_id: conv.buyer_id,
            conversation_id: conversationId,
            is_first_message: false,
            source: "chat",
          },
        });
      }
    } finally {
      setSending(false);
    }
  };

  // ── Render — all conditional branches live here, never above hooks ─────────
  if (convsLoading) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div className="p-4 border-b border-border/50 flex items-center gap-3">
        <Button variant="ghost" size="icon" className="md:hidden" onClick={onBack}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-sm font-bold text-muted-foreground">
          {(conv?.other_user?.display_name || "P").charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-sm">{conv?.other_user?.display_name || t("common.user")}</p>
          {productTitle && <p className="text-xs text-primary truncate">{productTitle}</p>}
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="text-center text-muted-foreground text-sm">{t("messages.loadingMessages")}</div>
        ) : messages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">{t("messages.startConversation")}</div>
        ) : (
          messages.map((msg) => {
            const isMine = msg.sender_id === currentUserId;
            return (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${isMine ? "justify-end" : "justify-start"}`}
              >
                <div className={`max-w-[75%] rounded-2xl px-4 py-2.5 text-sm ${isMine ? "bg-primary text-primary-foreground rounded-br-md" : "glass-card rounded-bl-md"}`}>
                  <p>{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${isMine ? "text-primary-foreground/60" : "text-muted-foreground"}`}>
                    {formatDistanceToNow(new Date(msg.created_at), { addSuffix: true, locale: dateLocale })}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input */}
      <div className="p-4 border-t border-border/50">
        <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("messages.placeholder")}
            className="bg-secondary/50"
          />
          <Button type="submit" variant="gold" size="icon" disabled={!input.trim() || sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </div>
    </>
  );
}

export default Messages;
