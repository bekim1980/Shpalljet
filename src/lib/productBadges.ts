// Shared signal computation for listing badges.
// Neutral, trust-forward labels — no "ad-like" wording.
//
// Smart label selection (only ONE primary badge per listing, picked by priority):
//   1. Top pick   — boosted + high engagement (views >= POPULAR_VIEWS OR messages >= 1)
//   2. Featured   — boosted + new (created within NEW_WINDOW_MS)
//   3. Promoted   — boosted only (active boost, no other signal)
//   4. Popular    — organic high views (>= POPULAR_VIEWS) without boost
//   5. New        — created within last 24h
//
// Secondary signals (still surfaced as small chips, but never duplicate the primary):
//   - Deal: price <= 0.85 * peak in price_history
//   - High interest: messages_count >= 1 (only when not already implied by primary)

export type BadgeKey =
  | "top_pick"
  | "featured"
  | "promoted"
  | "popular"
  | "new"
  | "deal"
  | "interest";

export interface BadgeSignal {
  key: BadgeKey;
  emoji: string;
  label: string;
  /** Tailwind classes for chip background/text. */
  className: string;
}

export interface ListingForBadges {
  is_boosted?: boolean | null;
  boost_expires_at?: string | null;
  views_count?: number | null;
  messages_count?: number | null;
  created_at?: string | null;
  price?: number | null;
  price_history?: unknown; // jsonb: [{price, changed_at}, ...]
}

const POPULAR_VIEWS = 50;
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEAL_DROP_RATIO = 0.85; // price <= 85% of peak

const isActiveBoost = (l: ListingForBadges, now: number): boolean =>
  !!l.is_boosted && !!l.boost_expires_at && new Date(l.boost_expires_at).getTime() > now;

const peakHistoricalPrice = (l: ListingForBadges): number | null => {
  const arr = Array.isArray(l.price_history) ? (l.price_history as Array<{ price?: number }>) : null;
  if (!arr || arr.length === 0) return null;
  const prices = arr
    .map((e) => Number(e?.price))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length === 0) return null;
  return Math.max(...prices);
};

export const isDeal = (l: ListingForBadges): boolean => {
  const peak = peakHistoricalPrice(l);
  const current = Number(l.price ?? 0);
  if (!peak || !current) return false;
  return current <= peak * DEAL_DROP_RATIO;
};

// Subtle, professional palette — neutral surfaces with a single tinted accent.
// Avoid saturated/flashy combos. Use design tokens where possible.
const STYLES = {
  neutral: "bg-secondary/60 text-foreground/80 border border-border",
  primary: "bg-primary/10 text-primary border border-primary/25",
  muted: "bg-muted/60 text-muted-foreground border border-border",
  good: "bg-emerald-500/10 text-emerald-300 border border-emerald-500/25",
  fresh: "bg-sky-500/10 text-sky-300 border border-sky-500/25",
} as const;

const hasHighEngagement = (l: ListingForBadges): boolean =>
  (l.views_count ?? 0) >= POPULAR_VIEWS || (l.messages_count ?? 0) >= 1;

const isNew = (l: ListingForBadges, now: number): boolean =>
  !!l.created_at && now - new Date(l.created_at).getTime() <= NEW_WINDOW_MS;

export const computeBadges = (l: ListingForBadges): BadgeSignal[] => {
  const now = Date.now();
  const out: BadgeSignal[] = [];
  const boosted = isActiveBoost(l, now);
  const engaged = hasHighEngagement(l);
  const fresh = isNew(l, now);

  // --- Primary badge (pick one, by priority) ---
  if (boosted && engaged) {
    out.push({ key: "top_pick", emoji: "★", label: "Top pick", className: STYLES.primary });
  } else if (boosted && fresh) {
    out.push({ key: "featured", emoji: "✦", label: "Featured", className: STYLES.primary });
  } else if (boosted) {
    out.push({ key: "promoted", emoji: "", label: "Promoted", className: STYLES.muted });
  } else if (engaged && (l.views_count ?? 0) >= POPULAR_VIEWS) {
    out.push({ key: "popular", emoji: "", label: "Popular", className: STYLES.neutral });
  } else if (fresh) {
    out.push({ key: "new", emoji: "", label: "New", className: STYLES.fresh });
  }

  // --- Secondary signals (additive, but avoid redundancy with primary) ---
  if (isDeal(l)) {
    out.push({ key: "deal", emoji: "", label: "Good deal", className: STYLES.good });
  }
  const primaryKey = out[0]?.key;
  const interestImplied = primaryKey === "top_pick" || primaryKey === "popular";
  if (!interestImplied && (l.messages_count ?? 0) >= 1) {
    out.push({ key: "interest", emoji: "", label: "High interest", className: STYLES.neutral });
  }

  return out;
};
