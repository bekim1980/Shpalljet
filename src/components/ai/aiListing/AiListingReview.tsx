import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Sparkles, AlertCircle, Tag, FileText, ChevronRight, Loader2, Package,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import type { DraftData } from "@/hooks/useDraftListing";
import type { AiListingAnalysis } from "@/types/aiListing";
import { VERTICAL_CATEGORIES, CONDITIONS } from "@/data/verticalConfig";
import type { Vertical } from "@/contexts/VerticalContext";
import { VERTICALS } from "@/contexts/VerticalContext";
import { SUPPORTED_CURRENCIES, COUNTRIES } from "@/lib/currency";
import ConfidenceBadge, { confidenceLevel } from "./ConfidenceBadge";

interface Props {
  analysis: AiListingAnalysis;
  draft: DraftData;
  previews: string[];
  onDraftChange: (updates: Partial<DraftData>) => void;
  onAnalysisPatch: (patch: Partial<AiListingAnalysis>) => void;
  missingAnswers: Record<string, string>;
  onMissingAnswer: (field: string, value: string) => void;
  disambiguationChoice: Record<string, string>;
  onDisambiguationChoice: (field: string, value: string) => void;
  errors: Record<string, string>;
  submitting: boolean;
  onPublish: () => void;
  onBack: () => void;
  defaultCurrency: string;
}

const verticalIcons: Record<string, string> = {
  luxe: "👑", market: "🛒", rent: "🏠", services: "💼", jobs: "📋",
};

const AiListingReview = ({
  analysis,
  draft,
  previews,
  onDraftChange,
  onAnalysisPatch,
  missingAnswers,
  onMissingAnswer,
  disambiguationChoice,
  onDisambiguationChoice,
  errors,
  submitting,
  onPublish,
  onBack,
  defaultCurrency,
}: Props) => {
  const { t } = useTranslation();
  const v = draft.selectedVertical as Vertical | null;
  const categories = v ? VERTICAL_CATEGORIES[v] : [];
  const subs = categories.find((c) => c.value === draft.category)?.subcategories ?? [];

  const visibleAttributes = useMemo(
    () => analysis.attributes.filter((a) => a.value.trim() && a.confidence >= 50),
    [analysis.attributes],
  );

  const uncertainAttributes = useMemo(
    () => analysis.attributes.filter((a) => a.confidence < 60),
    [analysis.attributes],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Recognition banner */}
      <div className="rounded-xl border border-primary/25 bg-gradient-to-br from-primary/10 via-primary/5 to-transparent p-4">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/20">
            <Sparkles className="h-4 w-4 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <ConfidenceBadge confidence={analysis.overall_confidence} />
              <span className="text-xs text-muted-foreground">{t("aiListing.recognizedAs")}</span>
            </div>
            <p className="font-display font-semibold text-sm leading-snug">{analysis.recognition_summary}</p>
            {confidenceLevel(analysis.overall_confidence) === "low" && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                {t("aiListing.lowConfidenceHint")}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Photo strip */}
      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {previews.map((src, i) => (
            <div key={i} className="relative h-16 w-16 shrink-0 overflow-hidden rounded-lg border border-border">
              <img src={src} alt="" className="h-full w-full object-cover" />
              {i === 0 && (
                <span className="absolute bottom-0.5 left-0.5 text-[8px] font-bold px-1 rounded bg-primary text-primary-foreground">
                  {t("aiListing.cover")}
                </span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Disambiguation */}
      {analysis.disambiguation.map((d) => (
        <div key={d.field} className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ConfidenceBadge confidence={d.confidence} />
            <p className="text-sm font-medium">{d.message}</p>
          </div>
          <RadioGroup
            value={disambiguationChoice[d.field] ?? ""}
            onValueChange={(val) => onDisambiguationChoice(d.field, val)}
            className="space-y-2"
          >
            {d.options.map((opt) => (
              <div key={opt.value} className="flex items-center gap-2">
                <RadioGroupItem value={opt.value} id={`${d.field}-${opt.value}`} />
                <Label htmlFor={`${d.field}-${opt.value}`} className="text-sm font-normal cursor-pointer">
                  {opt.label}
                </Label>
              </div>
            ))}
          </RadioGroup>
        </div>
      ))}

      {/* Missing fields */}
      {analysis.missing_fields.map((mf) => (
        <div key={mf.field} className="rounded-xl border border-border bg-card p-4 space-y-2">
          <Label className="text-sm font-medium flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 text-amber-500" />
            {mf.label}
          </Label>
          <p className="text-xs text-muted-foreground">{mf.reason}</p>
          {mf.options && mf.options.length > 0 ? (
            <Select
              value={missingAnswers[mf.field] ?? ""}
              onValueChange={(val) => onMissingAnswer(mf.field, val)}
            >
              <SelectTrigger className="bg-secondary/50">
                <SelectValue placeholder={t("sell.select")} />
              </SelectTrigger>
              <SelectContent>
                {mf.options.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input
              type={mf.input_type === "number" ? "number" : "text"}
              className="bg-secondary/50"
              value={missingAnswers[mf.field] ?? ""}
              onChange={(e) => onMissingAnswer(mf.field, e.target.value)}
              placeholder={mf.label}
            />
          )}
        </div>
      ))}

      {/* Vertical (editable) */}
      <div className="space-y-2">
        <Label>{t("sell.section")}</Label>
        <div className="grid grid-cols-5 gap-1.5">
          {VERTICALS.map((vert) => (
            <button
              key={vert.value}
              type="button"
              onClick={() => onDraftChange({ selectedVertical: vert.value, category: "", subcategory: "" })}
              className={`p-2 rounded-lg border text-center text-[10px] font-bold transition-all ${
                v === vert.value ? "border-primary bg-primary/10 ring-1 ring-primary" : "border-border bg-card"
              }`}
            >
              <span className="block text-base mb-0.5">{verticalIcons[vert.value]}</span>
              {vert.label}
            </button>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="ai-title">{t("sell.titleField")} *</Label>
          <ConfidenceBadge confidence={analysis.title_confidence} />
        </div>
        <div className="relative">
          <Tag className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="ai-title"
            className="pl-9 bg-secondary/50"
            value={draft.title}
            onChange={(e) => onDraftChange({ title: e.target.value })}
            maxLength={100}
          />
        </div>
        {errors.title && <p className="text-xs text-destructive">{errors.title}</p>}
      </div>

      {/* Description */}
      <div className="space-y-2">
        <Label htmlFor="ai-desc">{t("sell.description")}</Label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Textarea
            id="ai-desc"
            className="pl-9 bg-secondary/50 min-h-[100px]"
            value={draft.description}
            onChange={(e) => onDraftChange({ description: e.target.value })}
            maxLength={2000}
          />
        </div>
      </div>

      {/* Category + subcategory */}
      {v && (
        <>
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("sell.category")} *</Label>
              <ConfidenceBadge confidence={analysis.category_confidence} />
            </div>
            <Select
              value={draft.category}
              onValueChange={(val) => onDraftChange({ category: val, subcategory: "" })}
            >
              <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("sell.select")} /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.category && <p className="text-xs text-destructive">{errors.category}</p>}
          </div>
          {subs.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("sell.subcategory")}</Label>
                {analysis.subcategory_confidence != null && (
                  <ConfidenceBadge confidence={analysis.subcategory_confidence} />
                )}
              </div>
              <Select
                value={draft.subcategory || ""}
                onValueChange={(val) => onDraftChange({ subcategory: val })}
              >
                <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("sell.subcategoryPlaceholder")} /></SelectTrigger>
                <SelectContent>
                  {subs.map((s) => (
                    <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </>
      )}

      {/* Brand + model */}
      {(analysis.brand || draft.brand) && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("sell.brand")}</Label>
              {analysis.brand_confidence != null && <ConfidenceBadge confidence={analysis.brand_confidence} />}
            </div>
            <Input
              className="bg-secondary/50"
              value={draft.brand}
              onChange={(e) => onDraftChange({ brand: e.target.value })}
            />
          </div>
          {analysis.model && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("aiListing.model")}</Label>
                {analysis.model_confidence != null && <ConfidenceBadge confidence={analysis.model_confidence} />}
              </div>
              <Input
                className="bg-secondary/50"
                value={analysis.model}
                onChange={(e) => onAnalysisPatch({ model: e.target.value })}
              />
            </div>
          )}
        </div>
      )}

      {/* Condition */}
      {(v === "luxe" || v === "market") && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label>{t("sell.condition")} *</Label>
            <ConfidenceBadge confidence={analysis.condition_confidence} />
          </div>
          <Select value={draft.condition} onValueChange={(val) => onDraftChange({ condition: val })}>
            <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("sell.select")} /></SelectTrigger>
            <SelectContent>
              {CONDITIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.condition && <p className="text-xs text-destructive">{errors.condition}</p>}
        </div>
      )}

      {/* Attributes */}
      {visibleAttributes.length > 0 && (
        <div className="space-y-2">
          <Label>{t("aiListing.specifications")}</Label>
          <div className="rounded-xl border border-border divide-y divide-border">
            {visibleAttributes.map((attr) => (
              <div key={attr.key} className="flex items-center justify-between gap-2 px-3 py-2 text-sm">
                <span className="text-muted-foreground capitalize">{attr.key}</span>
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium truncate">{attr.value}</span>
                  <ConfidenceBadge confidence={attr.confidence} />
                </div>
              </div>
            ))}
          </div>
          {uncertainAttributes.length > 0 && (
            <p className="text-[11px] text-muted-foreground">{t("aiListing.uncertainSpecs")}</p>
          )}
        </div>
      )}

      {/* Tags */}
      {analysis.tags.length > 0 && (
        <div className="space-y-2">
          <Label>{t("aiListing.tags")}</Label>
          <div className="flex flex-wrap gap-1.5">
            {analysis.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full bg-secondary px-2.5 py-0.5 text-xs text-muted-foreground"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Price — always manual */}
      <div className="rounded-xl border-2 border-dashed border-primary/30 bg-primary/5 p-4 space-y-3">
        <p className="text-xs font-medium text-primary">{t("aiListing.priceManual")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="ai-price">{t("sell.price")} *</Label>
            <Input
              id="ai-price"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              className="bg-background"
              value={draft.price}
              onChange={(e) => onDraftChange({ price: e.target.value })}
            />
            {errors.price && <p className="text-xs text-destructive">{errors.price}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t("sell.currency")}</Label>
            <Select
              value={draft.currency || defaultCurrency}
              onValueChange={(val) => onDraftChange({ currency: val })}
            >
              <SelectTrigger className="bg-background"><SelectValue /></SelectTrigger>
              <SelectContent>
                {SUPPORTED_CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>{c.symbol} {c.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Location — always manual */}
      <div className="rounded-xl border border-border bg-card p-4 space-y-3">
        <p className="text-xs font-medium text-muted-foreground">{t("aiListing.locationManual")}</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>{t("sell.country")}</Label>
            <Select value={draft.country || ""} onValueChange={(val) => onDraftChange({ country: val })}>
              <SelectTrigger className="bg-secondary/50"><SelectValue placeholder={t("sell.select")} /></SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{t(c.labelKey)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-city">{t("sell.city")}</Label>
            <Input
              id="ai-city"
              className="bg-secondary/50"
              value={draft.city || ""}
              onChange={(e) => onDraftChange({ city: e.target.value })}
              placeholder={t("sell.cityPlaceholder")}
            />
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="ai-location">{t("sell.location")}</Label>
          <Input
            id="ai-location"
            className="bg-secondary/50"
            value={draft.location}
            onChange={(e) => onDraftChange({ location: e.target.value })}
            placeholder={t("sell.locationPlaceholder")}
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
          {t("aiListing.back")}
        </Button>
        <Button type="button" variant="gold" className="flex-[2]" onClick={onPublish} disabled={submitting}>
          {submitting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Package className="h-4 w-4 mr-2" />
              {t("sell.publish")}
              <ChevronRight className="h-4 w-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
};

export default AiListingReview;
