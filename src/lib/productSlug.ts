// Utilities for resolving product identifiers from URL params.
// Supports raw UUIDs (from /product/:id) and slug-with-uuid (e.g. /p/iphone-13-pro-<uuid>).

const UUID_RE = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;

/** Extract a product UUID from a URL param. Returns undefined if no UUID is embedded. */
export const extractProductId = (param: string | undefined): string | undefined => {
  if (!param) return undefined;
  const match = param.match(UUID_RE);
  return match ? match[0].toLowerCase() : undefined;
};

/** Build a SEO-friendly slug that always embeds the full UUID at the end. */
export const buildProductSlug = (title: string, id: string): string => {
  const base = title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return base ? `${base}-${id}` : id;
};
