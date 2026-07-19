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

/** Accept object map or [{key,value}] arrays; drop empty/Unknown values. */
const attributesField = z.preprocess((v) => {
  if (v == null || v === "") return {};
  const out: Record<string, string> = {};
  if (Array.isArray(v)) {
    for (const item of v) {
      if (!item || typeof item !== "object") continue;
      const rec = item as Record<string, unknown>;
      const k = String(rec.key ?? "").trim();
      const val = String(rec.value ?? "").trim();
      if (k && val && val.toLowerCase() !== "unknown") out[k] = val;
    }
    return out;
  }
  if (typeof v === "object") {
    for (const [k, val] of Object.entries(v as Record<string, unknown>)) {
      const key = k.trim();
      const s = val == null ? "" : String(val).trim();
      if (key && s && s.toLowerCase() !== "unknown") out[key] = s;
    }
    return out;
  }
  return {};
}, z.record(z.string()));

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
  /** Category-specific specs; keys must match the selected category's attribute keys. */
  attributes: attributesField.optional().default({}),
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
