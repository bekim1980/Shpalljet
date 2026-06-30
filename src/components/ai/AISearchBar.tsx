import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const URL_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

interface Props {
  defaultQuery?: string;
  onParsed?: (filters: ParsedFilters, rawQuery: string) => void;
  className?: string;
}

export interface ParsedFilters {
  cleaned_query: string;
  vertical?: string;
  condition?: string;
  price_min?: number;
  price_max?: number;
  location?: string;
  sort_by?: string;
  intent?: string;
  explanation?: string;
}

const AISearchBar = ({ defaultQuery = "", onParsed, className }: Props) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [q, setQ] = useState(defaultQuery);
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!q.trim() || loading) return;
    setLoading(true);
    try {
      const resp = await fetch(URL_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ mode: "parse_search", query: q }),
      });
      if (resp.status === 429) { toast.error(t("ai.rateLimit")); return; }
      if (resp.status === 402) { toast.error(t("ai.creditsOut")); return; }
      if (!resp.ok) throw new Error("parse failed");
      const data = await resp.json();
      const filters: ParsedFilters = data.filters ?? { cleaned_query: q };
      if (onParsed) {
        onParsed(filters, q);
      } else {
        const params = new URLSearchParams({ q: filters.cleaned_query || q });
        navigate(`/search?${params.toString()}`);
      }
      if (filters.explanation) toast.success(filters.explanation);
    } catch {
      // Fallback: just navigate with raw query
      if (onParsed) onParsed({ cleaned_query: q }, q);
      else navigate(`/search?q=${encodeURIComponent(q)}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className={`flex gap-2 ${className ?? ""}`}>
      <div className="relative flex-1">
        <Sparkles className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("ai.searchPlaceholder")}
          className="pl-9 h-11 bg-secondary/60 border-border/50"
          disabled={loading}
        />
      </div>
      <Button type="submit" variant="gold" className="h-11 shrink-0" disabled={!q.trim() || loading}>
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("ai.askAi")}
      </Button>
    </form>
  );
};

export default AISearchBar;
