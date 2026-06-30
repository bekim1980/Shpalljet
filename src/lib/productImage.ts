/** First non-empty http(s) URL from a product image list. */
export function pickFirstValidImageUrl(
  urls?: unknown,
  fallback?: string | null,
): string | null {
  const list = Array.isArray(urls) ? urls : [];
  for (const raw of list) {
    if (typeof raw !== "string") continue;
    const trimmed = raw.trim();
    if (!trimmed) continue;
    try {
      const u = new URL(trimmed, typeof window !== "undefined" ? window.location.origin : undefined);
      if (u.protocol === "https:" || u.protocol === "http:") return u.href;
    } catch {
      if (trimmed.startsWith("/")) return trimmed;
    }
  }
  if (typeof fallback === "string" && fallback.trim()) {
    return fallback.trim();
  }
  return null;
}

/** Up to 5 loadable image URLs for galleries. */
export function pickValidImageUrls(
  urls?: unknown,
  fallback?: string | null,
): string[] {
  const list = Array.isArray(urls) ? urls : [];
  const out: string[] = [];
  for (const raw of list) {
    const valid = pickFirstValidImageUrl([raw]);
    if (valid && !out.includes(valid)) out.push(valid);
    if (out.length >= 5) break;
  }
  if (out.length === 0) {
    const fb = pickFirstValidImageUrl([fallback]);
    if (fb) out.push(fb);
  }
  return out;
}
