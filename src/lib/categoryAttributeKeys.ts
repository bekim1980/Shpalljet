import { VERTICAL_CATEGORIES } from "../data/verticalConfig";

/**
 * Category-specific attribute keys aligned to VERTICAL_CATEGORIES slugs.
 * Used by Gemini listing generation and mapper filtering — not a parallel catalog.
 */
const BY_SUBCATEGORY: Record<string, readonly string[]> = {
  "electronics-phones": ["brand", "model", "storage", "ram", "color", "condition"],
  "electronics-tablets": ["brand", "model", "storage", "ram", "color", "condition"],
  "electronics-laptops": [
    "brand",
    "model",
    "processor",
    "ram",
    "storage",
    "graphics_card",
    "screen_size",
  ],
  "electronics-tv": ["brand", "model", "screen_size", "color", "condition"],
  "electronics-gaming": ["brand", "model", "storage", "color", "condition"],
  "electronics-cameras": ["brand", "model", "color", "condition"],
  "vehicles-cars": [
    "make",
    "model",
    "year",
    "mileage",
    "fuel_type",
    "transmission",
    "engine",
    "body_type",
  ],
  "vehicles-motorcycles": [
    "make",
    "model",
    "year",
    "mileage",
    "fuel_type",
    "transmission",
    "engine",
  ],
  "vehicles-parts": ["make", "model", "condition"],
  "vehicles-accessories": ["make", "model", "condition"],
  "vehicles-rent-car": ["make", "model", "year", "fuel_type", "transmission"],
  "vehicles-rent-van": ["make", "model", "year", "fuel_type", "transmission"],
  "vehicles-rent-motorcycle": ["make", "model", "year", "fuel_type"],
  "apartments-studio": [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  "apartments-1bed": [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  "apartments-2bed": [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  "apartments-3bed": [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  "apartments-penthouse": [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  "houses-house": [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  "houses-villa": [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  "houses-townhouse": [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  "houses-vacation": [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  "commercial-office": ["property_type", "location", "area", "rooms", "floor", "furnishing"],
  "commercial-shop": ["property_type", "location", "area", "floor", "furnishing"],
  "commercial-warehouse": ["property_type", "location", "area"],
  "commercial-land": ["property_type", "location", "area"],
  "clothing-men": ["brand", "size", "color", "material", "gender", "condition"],
  "clothing-women": ["brand", "size", "color", "material", "gender", "condition"],
  "clothing-kids": ["brand", "size", "color", "material", "gender", "condition"],
  "clothing-shoes": ["brand", "size", "color", "material", "gender", "condition"],
  "clothing-sportswear": ["brand", "size", "color", "material", "gender", "condition"],
  "fashion-dresses": ["brand", "size", "color", "material", "gender", "condition"],
  "fashion-suits": ["brand", "size", "color", "material", "gender", "condition"],
  "fashion-shoes": ["brand", "size", "color", "material", "gender", "condition"],
  "fashion-accessories": ["brand", "size", "color", "material", "condition"],
  "furniture-living": ["type", "material", "color", "dimensions", "condition"],
  "furniture-bedroom": ["type", "material", "color", "dimensions", "condition"],
  "furniture-kitchen": ["type", "material", "color", "dimensions", "condition"],
  "furniture-office": ["type", "material", "color", "dimensions", "condition"],
  "furniture-garden": ["type", "material", "color", "dimensions", "condition"],
};

const BY_CATEGORY: Record<string, readonly string[]> = {
  electronics: ["brand", "model", "storage", "ram", "color", "condition"],
  vehicles: ["make", "model", "year", "mileage", "fuel_type", "transmission", "engine", "body_type"],
  "vehicles-rent": ["make", "model", "year", "fuel_type", "transmission"],
  apartments: [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  houses: [
    "property_type",
    "location",
    "area",
    "rooms",
    "bedrooms",
    "bathrooms",
    "floor",
    "furnishing",
  ],
  commercial: ["property_type", "location", "area", "rooms", "floor", "furnishing"],
  clothing: ["brand", "size", "color", "material", "gender", "condition"],
  fashion: ["brand", "size", "color", "material", "gender", "condition"],
  furniture: ["type", "material", "color", "dimensions", "condition"],
};

/** Resolve allowed attribute keys for a Gemini category / subcategory slug. */
export function getAttributeKeysForCategory(
  category: string,
  subcategory: string,
): readonly string[] {
  const sub = subcategory.trim().toLowerCase();
  const cat = category.trim().toLowerCase();
  if (sub && BY_SUBCATEGORY[sub]) return BY_SUBCATEGORY[sub];
  if (cat && BY_CATEGORY[cat]) return BY_CATEGORY[cat];
  if (sub) {
    for (const [key, attrs] of Object.entries(BY_SUBCATEGORY)) {
      if (sub.includes(key) || key.includes(sub)) return attrs;
    }
  }
  if (cat) {
    for (const [key, attrs] of Object.entries(BY_CATEGORY)) {
      if (cat.includes(key) || key.includes(cat)) return attrs;
    }
  }
  return [];
}

/** Compact prompt block: category slug → attribute keys (from VERTICAL_CATEGORIES). */
export function buildCategoryAttributePromptGuide(): string {
  const lines: string[] = [];
  for (const cats of Object.values(VERTICAL_CATEGORIES)) {
    for (const c of cats) {
      const catKeys = getAttributeKeysForCategory(c.value, "");
      if (catKeys.length) {
        lines.push(`- ${c.value}: ${catKeys.join(", ")}`);
      }
      for (const s of c.subcategories ?? []) {
        const keys = getAttributeKeysForCategory(c.value, s.value);
        if (keys.length) {
          lines.push(`- ${s.value}: ${keys.join(", ")}`);
        }
      }
    }
  }
  return lines.join("\n");
}

/** Keep only non-empty attribute values; optionally restrict to allowed keys. */
export function sanitizeCategoryAttributes(
  raw: Record<string, string> | undefined,
  category: string,
  subcategory: string,
): Record<string, string> {
  if (!raw || typeof raw !== "object") return {};
  const allowed = getAttributeKeysForCategory(category, subcategory);
  const allowedSet = allowed.length > 0 ? new Set(allowed) : null;
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(raw)) {
    const k = key.trim();
    const v = String(value ?? "").trim();
    if (!k || !v) continue;
    if (v.toLowerCase() === "unknown" || v === "E panjohur") continue;
    if (allowedSet && !allowedSet.has(k)) continue;
    out[k] = v;
  }
  return out;
}
