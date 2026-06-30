import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ReactMarkdown from "react-markdown";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const AIChatWidget = () => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Cleanup any in-flight stream on unmount
  useEffect(() => () => abortRef.current?.abort(), []);

  const send = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    const userMsg: Msg = { role: "user", content: text };
    const next = [...messages, userMsg];
    setMessages(next);
    setInput("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    let acc = "";
    const upsert = (chunk: string) => {
      acc += chunk;
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.role === "assistant") {
          return prev.map((m, i) => (i === prev.length - 1 ? { ...m, content: acc } : m));
        }
        return [...prev, { role: "assistant", content: acc }];
      });
    };

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ mode: "chat", messages: next }),
        signal: controller.signal,
      });

      if (resp.status === 429) { toast.error(t("ai.rateLimit")); throw new Error("rate"); }
      if (resp.status === 402) { toast.error(t("ai.creditsOut")); throw new Error("credits"); }
      if (!resp.ok || !resp.body) throw new Error("Failed");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let done = false;
      while (!done) {
        const { done: d, value } = await reader.read();
        if (d) break;
        buffer += decoder.decode(value, { stream: true });
        let idx: number;
        while ((idx = buffer.indexOf("\n")) !== -1) {
          let line = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (!line || line.startsWith(":") || !line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") { done = true; break; }
          try {
            const parsed = JSON.parse(jsonStr);
            const c = parsed.choices?.[0]?.delta?.content;
            if (c) upsert(c);
          } catch {
            buffer = line + "\n" + buffer;
            break;
          }
        }
      }
    } catch (err: any) {
      if (err?.name !== "AbortError" && err?.message !== "rate" && err?.message !== "credits") {
        toast.error(t("ai.error"));
      }
      if (!acc) {
        setMessages((prev) => prev.filter((_, i) => i !== prev.length - 1 || prev[i].role !== "user"));
      }
    } finally {
      setStreaming(false);
      abortRef.current = null;
    }
  };

  return (
    <>
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen((o) => !o)}
        aria-label={t("ai.openAssistant")}
        className="fixed bottom-5 right-5 z-40 h-12 w-12 rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 flex items-center justify-center"
      >
        {open ? <X className="h-5 w-5" /> : <Sparkles className="h-5 w-5" />}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.18 }}
            className="fixed bottom-20 right-3 left-3 sm:left-auto sm:right-5 sm:w-[380px] z-40 glass-card rounded-2xl border border-border/50 shadow-2xl flex flex-col overflow-hidden"
            style={{ height: "min(70vh, 560px)" }}
          >
            <div className="p-3 border-b border-border/50 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <p className="font-display font-semibold text-sm flex-1">{t("ai.title")}</p>
            </div>

            <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-3">
              {messages.length === 0 && (
                <div className="text-center py-6 space-y-3">
                  <p className="text-xs text-muted-foreground">{t("ai.welcome")}</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {(t("ai.quickPrompts", { returnObjects: true }) as string[]).map((p) => (
                      <button
                        key={p}
                        onClick={() => setInput(p)}
                        className="text-[11px] px-2.5 py-1 rounded-full bg-secondary/60 hover:bg-secondary border border-border/40"
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-secondary/70 text-foreground rounded-bl-md"
                    }`}
                  >
                    {m.role === "assistant" ? (
                      <div className="prose prose-sm prose-invert max-w-none [&>*]:my-1 [&_ul]:pl-4 [&_ol]:pl-4 [&_p]:leading-snug">
                        <ReactMarkdown>{m.content || "…"}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap">{m.content}</p>
                    )}
                  </div>
                </div>
              ))}
              {streaming && messages[messages.length - 1]?.role === "user" && (
                <div className="flex justify-start"><Loader2 className="h-4 w-4 animate-spin text-muted-foreground" /></div>
              )}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); send(); }}
              className="p-3 border-t border-border/50 flex gap-2"
            >
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={t("ai.placeholder")}
                className="bg-secondary/50 h-9 text-sm"
                disabled={streaming}
              />
              <Button type="submit" size="icon" variant="gold" className="h-9 w-9 shrink-0" disabled={!input.trim() || streaming}>
                {streaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;
