import type { DraftData } from "@/hooks/useDraftListing";
import type { AiCondition, AiListingAnalysis } from "@/types/aiListing";

const CONDITION_MAP: Record<AiCondition, string> = {
  new: "new",
  "like-new": "like-new",
  excellent: "good",
  good: "good",
  fair: "used",
  "for-parts": "for-parts",
  unknown: "",
};

export function mapAiCondition(condition: AiCondition): string {
  return CONDITION_MAP[condition] ?? "";
}

export function applyAiAnalysisToDraft(
  analysis: AiListingAnalysis,
  categoryId: string,
): Partial<DraftData> {
  const condition = mapAiCondition(analysis.condition);
  return {
    selectedVertical: analysis.vertical,
    title: analysis.title,
    description: analysis.description,
    category: analysis.category,
    categoryId,
    subcategory: analysis.subcategory ?? "",
    condition,
    brand: analysis.brand ?? "",
    price: "",
  };
}

/** Append SEO tags and visible specs to description for search (no invented data). */
export function enrichDescriptionWithAiMeta(
  description: string,
  tags: string[],
  attributes: Array<{ key: string; value: string }>,
): string {
  const parts = [description.trim()];
  const specLines = attributes
    .filter((a) => a.value.trim())
    .map((a) => `${a.key}: ${a.value}`);
  if (specLines.length > 0) {
    parts.push("", "Specifications:", ...specLines);
  }
  const uniqueTags = [...new Set(tags.map((t) => t.trim()).filter(Boolean))].slice(0, 15);
  if (uniqueTags.length > 0) {
    parts.push("", `Keywords: ${uniqueTags.join(", ")}`);
  }
  return parts.join("\n");
}
