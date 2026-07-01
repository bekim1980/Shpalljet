/** Product image URL helpers — multi-variant pipeline + legacy single-JPEG support. */

export type ProductImageSize = "thumb" | "card" | "listing" | "large";

const PIPELINE_VARIANT_RE = /\/(thumb|card|listing|large)\.(webp|jpe?g)$/i;
const LEGACY_SINGLE_JPEG_RE = /\/[^/]+\.jpe?g$/i;

/** True when URL uses the multi-variant folder layout. */
export function isPipelineImageUrl(url: string): boolean {
  return PIPELINE_VARIANT_RE.test(url);
}

/** Swap variant segment in a pipeline URL. Legacy single-JPEG URLs pass through unchanged. */
export function resolveProductImageUrl(
  url: string | null | undefined,
  size: ProductImageSize = "listing",
): string | null {
  const trimmed = typeof url === "string" ? url.trim() : "";
  if (!trimmed) return null;

  if (PIPELINE_VARIANT_RE.test(trimmed)) {
    return trimmed.replace(PIPELINE_VARIANT_RE, `/${size}.$2`);
  }

  if (LEGACY_SINGLE_JPEG_RE.test(trimmed)) {
    return trimmed;
  }

  return trimmed;
}

const SRCSET_WIDTHS: Record<ProductImageSize, number> = {
  thumb: 320,
  card: 640,
  listing: 1280,
  large: 1920,
};

/** Responsive srcset for pipeline images; undefined for legacy URLs. */
export function buildProductImageSrcSet(url: string | null | undefined): string | undefined {
  if (!url || !isPipelineImageUrl(url)) return undefined;

  const parts: string[] = [];
  for (const size of ["thumb", "card", "listing", "large"] as const) {
    const resolved = resolveProductImageUrl(url, size);
    if (resolved) parts.push(`${resolved} ${SRCSET_WIDTHS[size]}w`);
  }
  return parts.length > 0 ? parts.join(", ") : undefined;
}

/** Suggested sizes attribute for card/thumbnail layouts. */
export function productImageSizes(defaultWidth = "640px"): string {
  return `(max-width: 768px) 50vw, ${defaultWidth}`;
}

/** First non-empty http(s) URL from a product image list. */
export function pickFirstValidImageUrl(
  urls?: unknown,
  fallback?: string | null,
  size: ProductImageSize = "listing",
): string | null {
  const list = Array.isArray(urls) ? urls : [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      const u = new URL(trimmed, typeof window !== "undefined" ? window.location.origin : undefined);
      if (u.protocol === "https:" || u.protocol === "http:") {
        return resolveProductImageUrl(u.href, size);
      }
    } catch {
      if (trimmed.startsWith("/")) return trimmed;
    }
  }
  if (typeof fallback === "string" && fallback.trim()) {
    return resolveProductImageUrl(fallback.trim(), size);
  }
  return null;
}

/** Up to 5 loadable image URLs for galleries. */
export function pickValidImageUrls(
  urls?: unknown,
  fallback?: string | null,
  size: ProductImageSize = "listing",
): string[] {
  const list = Array.isArray(urls) ? urls : [];
  const out: string[] = [];
  for (const raw of list) {
    const valid = pickFirstValidImageUrl([raw], null, size);
    if (valid && !out.includes(valid)) out.push(valid);
    if (out.length >= 5) break;
  }
  if (out.length === 0) {
    const fb = pickFirstValidImageUrl([fallback], null, size);
    if (fb) out.push(fb);
  }
  return out;
}
