import { z } from "zod";

const stringField = z.preprocess(
  (v) => (v === null || v === undefined ? "Unknown" : String(v)),
  z.string(),
);

const stringArrayField = z.preprocess((v) => {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (typeof v === "string" && v.trim()) {
    return v.split(/[,;]\s*/).map((s) => s.trim()).filter(Boolean);
  }
  return [] as string[];
}, z.array(z.string()));

export const GeminiListingSchema = z.object({
  seo_title: stringField,
  marketplace_title: stringField,
  category: stringField,
  subcategory: stringField,
  brand: stringField,
  model: stringField,
  condition: stringField,
  color: stringField,
  description: stringField,
  features: stringArrayField,
  keywords: stringArrayField,
  tags: stringArrayField,
  url_slug: stringField,
  meta_title: stringField,
  meta_description: stringField,
  image_alt_text: stringField,
  price_estimate: stringField,
});

export type GeminiListingResult = z.infer<typeof GeminiListingSchema>;

export function parseGeminiListingJson(raw: unknown): GeminiListingResult {
  let data: unknown = raw;
  if (typeof raw === "string") {
    const trimmed = raw.trim().replace(/^```json\s*/i, "").replace(/```\s*$/i, "");
    data = JSON.parse(trimmed);
  }
  return GeminiListingSchema.parse(data);
}
