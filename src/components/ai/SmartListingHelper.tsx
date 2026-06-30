import { useState } from "react";
import { Sparkles, Loader2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

const URL_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export interface ListingSuggestion {
  vertical: "luxe" | "market" | "rent" | "services";
  category_hint?: string;
  improved_title: string;
  improved_description: string;
  suggested_price_min?: number;
  suggested_price_max?: number;
  currency?: "EUR" | "ALL" | "MKD";
  tips: string[];
}

interface Props {
  title: string;
  description: string;
  vertical: string;
  onApply: (s: ListingSuggestion) => void;
}

const SmartListingHelper = ({ title, description, vertical, onApply }: Props) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState<ListingSuggestion | null>(null);
  const [aiError, setAiError] = useState(false);

  const fetchSuggestion = async () => {
    if (!title.trim() && !description.trim()) {
      toast.info(t("ai.helperNeedsInput"));
      return;
    }
    setLoading(true);
    setAiError(false);
    try {
      const resp = await fetch(URL_BASE, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ mode: "suggest_listing", title, description, vertical }),
      });
      if (resp.status === 429) { toast.error(t("ai.rateLimit")); return; }
      if (resp.status === 402) { toast.error(t("ai.creditsOut")); return; }
      if (!resp.ok) throw new Error("AI error");
      const data = await resp.json();
      if (!data.suggestion) throw new Error("No suggestion");
      setSuggestion(data.suggestion);
    } catch {
      setAiError(true);
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!suggestion) return;
    onApply(suggestion);
    toast.success(t("ai.applied"));
    setSuggestion(null);
  };

  return (
    <div className="rounded-xl border border-primary/30 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <Sparkles className="h-4 w-4 text-primary" />
          <span className="font-medium">{t("ai.helperTitle")}</span>
        </div>
        <Button type="button" size="sm" variant="gold-outline" onClick={fetchSuggestion} disabled={loading}>
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : t("ai.helperCta")}
        </Button>
      </div>

      {aiError && (
        <div className="flex items-start gap-2 rounded-md bg-destructive/10 border border-destructive/20 px-3 py-2">
          <span className="text-destructive text-xs mt-0.5">⚠</span>
          <p className="text-xs text-destructive/90 flex-1">
            {t("ai.unavailable", "AI suggestions unavailable. You can continue filling in the form manually.")}
            {" "}
            <button type="button" onClick={fetchSuggestion} className="underline hover:no-underline font-medium">
              {t("ai.retry", "Retry")}
            </button>
          </p>
        </div>
      )}

      {suggestion && (
        <div className="space-y-2 text-xs">
          <div>
            <p className="text-muted-foreground mb-0.5">{t("ai.helperSuggestedTitle")}</p>
            <p className="font-medium text-sm text-foreground">{suggestion.improved_title}</p>
          </div>
          {suggestion.improved_description && (
            <div>
              <p className="text-muted-foreground mb-0.5">{t("ai.helperSuggestedDesc")}</p>
              <p className="text-sm text-foreground whitespace-pre-wrap">{suggestion.improved_description}</p>
            </div>
          )}
          {(suggestion.suggested_price_min || suggestion.suggested_price_max) && (
            <p className="text-foreground">
              <span className="text-muted-foreground">{t("ai.helperPriceRange")}: </span>
              {suggestion.suggested_price_min ?? "-"} – {suggestion.suggested_price_max ?? "-"} {suggestion.currency ?? "EUR"}
            </p>
          )}
          {suggestion.tips?.length > 0 && (
            <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
              {suggestion.tips.map((tip, i) => <li key={i}>{tip}</li>)}
            </ul>
          )}
          <Button type="button" size="sm" variant="gold" className="w-full mt-2" onClick={apply}>
            <Check className="h-3.5 w-3.5 mr-1" />
            {t("ai.applySuggestions")}
          </Button>
        </div>
      )}
    </div>
  );
};

export default SmartListingHelper;
