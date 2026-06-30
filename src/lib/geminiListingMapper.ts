import { VERTICAL_CATEGORIES } from "@/data/verticalConfig";
import type { Vertical } from "@/contexts/VerticalContext";
import type { DraftData } from "@/hooks/useDraftListing";
import type { GeminiListingResult } from "@/lib/geminiListingSchema";
import type { AiListingAnalysis, AiCondition } from "@/types/aiListing";

const UNKNOWN = "unknown";

function normalizeCondition(raw: string): AiCondition {
  const v = raw.toLowerCase().trim();
  if (v === "new") return "new";
  if (v === "like-new" || v === "like new") return "like-new";
  if (v === "excellent") return "excellent";
  if (v === "good" || v === "used") return "good";
  if (v === "fair") return "fair";
  if (v === "for-parts" || v === "for parts") return "for-parts";
  return UNKNOWN;
}

function guessVertical(category: string, subcategory: string): Vertical {
  const slug = `${category}/${subcategory}`.toLowerCase();
  for (const [vertical, cats] of Object.entries(VERTICAL_CATEGORIES) as [
    Vertical,
    (typeof VERTICAL_CATEGORIES)[Vertical],
  ][]) {
    for (const c of cats) {
      if (
        c.value.toLowerCase() === category.toLowerCase() ||
        c.subcategories?.some((s) => s.value.toLowerCase() === subcategory.toLowerCase())
      ) {
        return vertical;
      }
      if (slug.includes(c.value.toLowerCase())) return vertical;
    }
  }
  return "market";
}

function parsePriceEstimate(estimate: string): string {
  if (!estimate || estimate.toLowerCase() === "unknown") return "";
  const nums = estimate.match(/\d+(?:[.,]\d+)?/g);
  if (!nums?.length) return "";
  const first = nums[0].replace(",", ".");
  return first;
}

/** Map Gemini SEO listing JSON → sell draft fields. */
export function applyGeminiListingToDraft(
  listing: GeminiListingResult,
  categoryId: string,
): Partial<DraftData> {
  const vertical = guessVertical(listing.category, listing.subcategory);
  const condition = normalizeCondition(listing.condition);
  const price = parsePriceEstimate(listing.price_estimate);

  const featureBlock =
    listing.features.length > 0
      ? `\n\nFeatures:\n${listing.features.map((f) => `• ${f}`).join("\n")}`
      : "";

  const metaBlock = [
    listing.meta_description && listing.meta_description !== "Unknown"
      ? listing.meta_description
      : "",
    listing.keywords.length ? `\nKeywords: ${listing.keywords.join(", ")}` : "",
    listing.tags.length ? `\nTags: ${listing.tags.join(", ")}` : "",
  ]
    .filter(Boolean)
    .join("");

  const description = [listing.description, featureBlock, metaBlock]
    .join("")
    .trim();

  return {
    selectedVertical: vertical,
    title: listing.marketplace_title !== "Unknown" ? listing.marketplace_title : listing.seo_title,
    description,
    category: listing.category !== "Unknown" ? listing.category : "",
    categoryId,
    subcategory: listing.subcategory !== "Unknown" ? listing.subcategory : "",
    condition: condition === UNKNOWN ? "" : condition,
    brand: listing.brand !== "Unknown" ? listing.brand : "",
    price,
  };
}

/** Bridge Gemini result into existing AI review UI shape. */
export function geminiListingToAnalysis(listing: GeminiListingResult): AiListingAnalysis {
  const vertical = guessVertical(listing.category, listing.subcategory);
  const condition = normalizeCondition(listing.condition);
  const attrs: Array<{ key: string; value: string; confidence: number }> = [];

  if (listing.color !== "Unknown") attrs.push({ key: "color", value: listing.color, confidence: 75 });
  if (listing.model !== "Unknown") attrs.push({ key: "model", value: listing.model, confidence: 70 });
  listing.features.forEach((f) => attrs.push({ key: "feature", value: f, confidence: 65 }));

  return {
    vertical,
    vertical_confidence: 72,
    category: listing.category !== "Unknown" ? listing.category : "general",
    category_confidence: 70,
    subcategory: listing.subcategory !== "Unknown" ? listing.subcategory : undefined,
    subcategory_confidence: 65,
    title: listing.marketplace_title !== "Unknown" ? listing.marketplace_title : listing.seo_title,
    title_confidence: 78,
    description: listing.description,
    brand: listing.brand !== "Unknown" ? listing.brand : undefined,
    brand_confidence: listing.brand !== "Unknown" ? 72 : 0,
    model: listing.model !== "Unknown" ? listing.model : undefined,
    model_confidence: listing.model !== "Unknown" ? 68 : 0,
    condition,
    condition_confidence: 70,
    attributes: attrs,
    tags: [...new Set([...listing.tags, ...listing.keywords])].slice(0, 15),
    missing_fields: [],
    disambiguation: [],
    recognition_summary: listing.meta_title !== "Unknown" ? listing.meta_title : listing.seo_title,
    overall_confidence: 75,
    image_quality_notes: listing.image_alt_text !== "Unknown" ? [listing.image_alt_text] : [],
  };
}
