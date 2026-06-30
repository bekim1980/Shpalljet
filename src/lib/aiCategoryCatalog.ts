import { VERTICAL_CATEGORIES } from "@/data/verticalConfig";
import type { Vertical } from "@/contexts/VerticalContext";

export interface CategoryCatalogEntry {
  vertical: Vertical;
  category: string;
  category_label: string;
  subcategories: Array<{ value: string; label: string }>;
}

/** Compact catalog sent to the vision model so category slugs match the UI. */
export function buildCategoryCatalog(): CategoryCatalogEntry[] {
  return (Object.entries(VERTICAL_CATEGORIES) as [Vertical, typeof VERTICAL_CATEGORIES[Vertical]][]).map(
    ([vertical, cats]) =>
      cats.map((c) => ({
        vertical,
        category: c.value,
        category_label: c.label,
        subcategories: c.subcategories ?? [],
      })),
  ).flat();
}
