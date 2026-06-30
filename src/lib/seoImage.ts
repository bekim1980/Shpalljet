export const SITE_URL = "https://shpalljet.lovable.app";
export const DEFAULT_OG_IMAGE = `${SITE_URL}/og-image.png`;

/**
 * Returns the first valid absolute http(s) image URL from the provided list,
 * falling back to DEFAULT_OG_IMAGE when none qualifies.
 */
export function getValidSeoImageUrl(images?: unknown): string {
  try {
    const list = Array.isArray(images) ? images : [];
    const firstValid = list.find((image): image is string => {
      if (typeof image !== "string" || image.length === 0) return false;
      try {
        const url = new URL(image);
        return url.protocol === "https:" || url.protocol === "http:";
      } catch {
        return false;
      }
    });
    return firstValid ?? DEFAULT_OG_IMAGE;
  } catch (e) {
    console.error("SEO image error", e);
    return DEFAULT_OG_IMAGE;
  }
}

/**
 * Build an absolute canonical URL for a product. Falls back safely when
 * title or id are missing/invalid.
 */
export function buildProductCanonical(
  title: string | undefined,
  id: string | undefined,
  slugFn: (title: string, id: string) => string,
): string {
  try {
    if (!id || typeof id !== "string") return `${SITE_URL}/`;
    const safeTitle = typeof title === "string" && title.trim().length > 0 ? title : "listing";
    const slug = slugFn(safeTitle, id);
    if (!slug || slug.includes("undefined") || slug.includes("null")) {
      return `${SITE_URL}/product/${id}`;
    }
    return `${SITE_URL}/p/${slug}`;
  } catch (e) {
    console.error("SEO canonical error", e);
    return `${SITE_URL}/`;
  }
}
