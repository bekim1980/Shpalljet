// Cron-invoked: 
//  1) Saved searches → smart in-app alerts with badges (Popular/Interest/Deal/New) + dedupe.
//  2) Price drops    → in-app alerts to users who viewed/favorited, with stronger copy if engaged.
//
// Constraints:
// - In-app notifications only (no email).
// - Idempotent: re-running the job must not duplicate alerts.
// - Null-safe filters; never break existing search flow.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SCORE_THRESHOLD = 0.15;          // saved-search alerts: only notify above this rank
const MAX_NOTIFS_PER_DAY = 2;          // saved-search rate limit per user
const TOP_N = 10;
const POPULAR_VIEWS = 50;
const NEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const DEAL_DROP_RATIO = 0.85;          // listing-level "good deal" via price_history peak
const CATEGORY_DEAL_RATIO = 0.85;      // category-level "good deal" via category average
const PRICE_DROP_LOOKBACK_HOURS = 6;   // detect drops that happened in the last N hours
const PRICE_DROP_MIN_PCT = 5;          // ignore <5% drops

type Listing = {
  id: string;
  title: string;
  price: number;
  views_count: number;
  messages_count: number;
  favorites_count: number;
  created_at: string;
  category: string;
  category_id: string | null;
  is_boosted: boolean;
  boost_expires_at: string | null;
  price_history: Array<{ price: number; changed_at: string }> | null;
  final_score?: number;
};

const peakPrice = (l: Listing): number | null => {
  const arr = Array.isArray(l.price_history) ? l.price_history : null;
  if (!arr?.length) return null;
  const prices = arr.map((e) => Number(e?.price)).filter((n) => Number.isFinite(n) && n > 0);
  return prices.length ? Math.max(...prices) : null;
};

const computeBadgesForAlert = (l: Listing, categoryAvg: number | null): string[] => {
  const now = Date.now();
  const out: string[] = [];
  if ((l.views_count ?? 0) >= POPULAR_VIEWS) out.push("🔥 Popular");
  if ((l.messages_count ?? 0) >= 1) out.push("⚡ High interest");

  // Deal: either local price drop OR category-cheap
  const peak = peakPrice(l);
  const isLocalDeal = !!peak && Number(l.price) <= peak * DEAL_DROP_RATIO;
  const isCategoryDeal = !!categoryAvg && categoryAvg > 0 && Number(l.price) <= categoryAvg * CATEGORY_DEAL_RATIO;
  if (isLocalDeal || isCategoryDeal) out.push("💰 Good deal");

  if (l.created_at && now - new Date(l.created_at).getTime() <= NEW_WINDOW_MS) out.push("🆕 New");
  return out;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const startedAt = new Date().toISOString();
  let savedProcessed = 0;
  let savedNotified = 0;
  let priceDropNotified = 0;
  const errors: string[] = [];

  try {
    // ─────────────────────────────────────────────────────────────────────────
    // Pre-compute category averages once per run (used by deal heuristic).
    // ─────────────────────────────────────────────────────────────────────────
    const { data: catAvgRows } = await supabase
      .from("products")
      .select("category, price")
      .eq("status", "active")
      .limit(5000);
    const categoryAvg = new Map<string, number>();
    if (catAvgRows?.length) {
      const buckets = new Map<string, { sum: number; n: number }>();
      for (const r of catAvgRows as Array<{ category: string; price: number }>) {
        const key = String(r.category ?? "").toLowerCase();
        if (!key) continue;
        const b = buckets.get(key) ?? { sum: 0, n: 0 };
        b.sum += Number(r.price) || 0;
        b.n += 1;
        buckets.set(key, b);
      }
      for (const [k, v] of buckets) if (v.n > 0) categoryAvg.set(k, v.sum / v.n);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 1) SAVED SEARCHES → smart alerts
    // ─────────────────────────────────────────────────────────────────────────
    const { data: searches, error: sErr } = await supabase
      .from("saved_searches")
      .select("*")
      .eq("is_active", true)
      .order("last_checked_at", { ascending: true })
      .limit(200);
    if (sErr) throw sErr;

    for (const s of searches ?? []) {
      savedProcessed++;
      try {
        const { data: ranked, error: rErr } = await supabase.rpc("rank_products", {
          search_query: s.query ?? "",
          filter_category_id: s.category_id ?? null,
          filter_vertical: s.vertical ?? null,
          filter_condition: s.condition ?? null,
          filter_price_min: s.price_min ?? null,
          filter_price_max: s.price_max ?? null,
          filter_location: s.location ?? null,
          result_limit: TOP_N,
          result_offset: 0,
        });
        if (rErr) { errors.push(`rank ${s.id}: ${rErr.message}`); continue; }

        const lastCheckedAt = new Date(s.last_checked_at);
        const candidates = ((ranked ?? []) as Listing[]).filter((p) => {
          const created = new Date(p.created_at);
          return created > lastCheckedAt && Number(p.final_score ?? 0) >= SCORE_THRESHOLD;
        });

        if (candidates.length === 0) {
          await supabase.from("saved_searches").update({ last_checked_at: startedAt }).eq("id", s.id);
          continue;
        }

        // Dedupe vs prior alerts (don't re-alert same product unless we later detect a price drop pass)
        const ids = candidates.map((p) => p.id);
        const { data: existing } = await supabase
          .from("search_alerts").select("product_id").eq("saved_search_id", s.id).in("product_id", ids);
        const seen = new Set((existing ?? []).map((r: any) => r.product_id));
        const fresh = candidates.filter((p) => !seen.has(p.id));

        if (fresh.length === 0) {
          await supabase.from("saved_searches").update({ last_checked_at: startedAt }).eq("id", s.id);
          continue;
        }

        // Insert alerts (idempotent via unique index, if any)
        await supabase.from("search_alerts").insert(
          fresh.map((p) => ({ saved_search_id: s.id, product_id: p.id, final_score: p.final_score ?? null })),
        );

        // Rate limit notifications: 1-2/day/user
        const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
        const { count: notifsToday } = await supabase
          .from("notifications").select("id", { count: "exact", head: true })
          .eq("user_id", s.user_id).eq("type", "saved_search").gte("created_at", since);

        if ((notifsToday ?? 0) >= MAX_NOTIFS_PER_DAY) {
          await supabase.from("saved_searches").update({ last_checked_at: startedAt }).eq("id", s.id);
          continue;
        }

        // Build a one-line preview of the top item with badges
        const top = fresh[0];
        const catKey = String(top.category ?? "").toLowerCase();
        const badges = computeBadgesForAlert(top, categoryAvg.get(catKey) ?? null);
        const badgeStr = badges.length ? ` ${badges.join(" · ")}` : "";

        const params = new URLSearchParams();
        if (s.query) params.set("q", s.query);
        if (s.category_id) params.set("category", s.category_id);
        if (s.condition) params.set("condition", s.condition);
        if (s.location) params.set("location", s.location);
        if (s.price_min != null) params.set("priceMin", String(s.price_min));
        if (s.price_max != null) params.set("priceMax", String(s.price_max));
        params.set("savedSearch", s.id);

        const label = s.query?.trim() || "your saved search";
        const message =
          `${fresh.length} new listing${fresh.length === 1 ? "" : "s"} match.` +
          ` Top: "${top.title}"${badgeStr}`;

        await supabase.from("notifications").insert({
          user_id: s.user_id,
          type: "saved_search",
          title: `New matches for '${label}'`,
          message,
          link: `/search?${params.toString()}`,
        });
        await supabase.from("saved_searches")
          .update({ last_checked_at: startedAt, last_notified_at: startedAt })
          .eq("id", s.id);
        savedNotified++;
      } catch (e: any) {
        errors.push(`search ${s.id}: ${e?.message ?? String(e)}`);
      }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // 2) PRICE-DROP ALERTS for viewers/favoriters
    // ─────────────────────────────────────────────────────────────────────────
    // Find products whose price was reduced in the recent window.
    const { data: recentChanged } = await supabase
      .from("products")
      .select("id, title, price, currency, price_history, updated_at, seller_id")
      .eq("status", "active")
      .gte("updated_at", new Date(Date.now() - PRICE_DROP_LOOKBACK_HOURS * 60 * 60 * 1000).toISOString())
      .not("price_history", "is", null)
      .limit(500);

    for (const p of (recentChanged ?? []) as any[]) {
      try {
        const hist = Array.isArray(p.price_history) ? p.price_history : [];
        if (!hist.length) continue;
        const prev = Number(hist[hist.length - 1]?.price);
        const cur = Number(p.price);
        if (!Number.isFinite(prev) || !Number.isFinite(cur) || prev <= 0) continue;
        const dropPct = ((prev - cur) / prev) * 100;
        if (dropPct < PRICE_DROP_MIN_PCT) continue;

        // Engaged users = viewers ∪ favoriters, excluding the seller
        const [{ data: viewers }, { data: favers }] = await Promise.all([
          supabase.from("product_views").select("viewer_id").eq("product_id", p.id).not("viewer_id", "is", null).limit(500),
          supabase.from("wishlist").select("user_id").eq("product_id", p.id).limit(500),
        ]);
        const userSet = new Set<string>();
        for (const r of (viewers ?? [])) if (r.viewer_id && r.viewer_id !== p.seller_id) userSet.add(r.viewer_id as string);
        const favoriters = new Set<string>();
        for (const r of (favers ?? [])) if (r.user_id && r.user_id !== p.seller_id) {
          userSet.add(r.user_id as string);
          favoriters.add(r.user_id as string);
        }
        if (userSet.size === 0) continue;

        // Idempotency: skip users already notified about THIS price for THIS product
        const { data: alreadyNotified } = await supabase
          .from("notifications")
          .select("user_id, message")
          .eq("type", "price_drop")
          .like("message", `%pid:${p.id}|to:${cur}%`)
          .in("user_id", Array.from(userSet));
        const skip = new Set((alreadyNotified ?? []).map((r: any) => r.user_id));

        const link = `/product/${p.id}`;
        const rows = Array.from(userSet)
          .filter((uid) => !skip.has(uid))
          .map((uid) => {
            const stronger = favoriters.has(uid);
            const base = `💰 Price dropped from ${prev} to ${cur} ${p.currency ?? "EUR"}`;
            const message = stronger
              ? `${base} — you favorited this. [pid:${p.id}|to:${cur}]`
              : `${base} — you viewed this recently. [pid:${p.id}|to:${cur}]`;
            return {
              user_id: uid,
              type: "price_drop",
              title: `Price drop: ${p.title}`,
              message,
              link,
            };
          });

        if (rows.length) {
          await supabase.from("notifications").insert(rows);
          priceDropNotified += rows.length;
        }
      } catch (e: any) {
        errors.push(`price-drop ${p.id}: ${e?.message ?? String(e)}`);
      }
    }

    return new Response(
      JSON.stringify({ ok: true, savedProcessed, savedNotified, priceDropNotified, errors }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({ ok: false, error: e?.message ?? String(e), savedProcessed, savedNotified, priceDropNotified }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
