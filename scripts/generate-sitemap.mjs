#!/usr/bin/env node
/**
 * Build-time sitemap generator.
 * Writes public/sitemap.xml from static routes + public Supabase listings.
 * Safe by design: never crashes the build — falls back to static sitemap on error.
 */
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, "../public/sitemap.xml");
const SITE = "https://shpalljet.net";

const STATIC_ROUTES = [
  { loc: "/", changefreq: "daily", priority: "1.0" },
  { loc: "/browse", changefreq: "daily", priority: "0.9" },
  { loc: "/rides", changefreq: "hourly", priority: "0.9" },
  { loc: "/pricing", changefreq: "monthly", priority: "0.6" },
  { loc: "/install", changefreq: "monthly", priority: "0.5" },
];

const VERTICALS = ["luxe", "market", "rent", "services", "jobs"];

const xmlEscape = (s) =>
  String(s).replace(/[<>&'"]/g, (c) =>
    ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", "'": "&apos;", '"': "&quot;" }[c])
  );

const urlTag = ({ loc, lastmod, changefreq, priority }) => {
  const parts = [`<loc>${xmlEscape(SITE + loc)}</loc>`];
  if (lastmod) parts.push(`<lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`<changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`<priority>${priority}</priority>`);
  return `  <url>${parts.join("")}</url>`;
};

const writeSitemap = (urls) => {
  mkdirSync(dirname(OUT), { recursive: true });
  const body =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map(urlTag).join("\n") +
    `\n</urlset>\n`;
  writeFileSync(OUT, body);
  console.log(`[sitemap] wrote ${urls.length} URLs → ${OUT}`);
};

const buildStaticUrls = () => [
  ...STATIC_ROUTES,
  ...VERTICALS.map((v) => ({
    loc: `/browse?vertical=${v}`,
    changefreq: "daily",
    priority: "0.7",
  })),
];

const fetchProducts = async (url, key) => {
  // PostgREST: only active listings, fields needed for sitemap
  const endpoint = `${url}/rest/v1/products?select=id,updated_at&status=eq.active&moderation_status=eq.approved&order=updated_at.desc&limit=5000`;
  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
};

const fetchRides = async (url, key) => {
  const endpoint = `${url}/rest/v1/rides?select=id,updated_at&status=eq.active&order=updated_at.desc&limit=2000`;
  const res = await fetch(endpoint, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
  });
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${await res.text()}`);
  return res.json();
};

const main = async () => {
  const urls = buildStaticUrls();
  const SUPA_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const SUPA_KEY =
    process.env.VITE_SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY;

  if (!SUPA_URL || !SUPA_KEY) {
    console.warn(
      "[sitemap] WARNING: VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY missing — writing static fallback sitemap."
    );
    writeSitemap(urls);
    return;
  }

  try {
    const [products, rides] = await Promise.all([
      fetchProducts(SUPA_URL, SUPA_KEY).catch((e) => {
        console.warn("[sitemap] products fetch failed:", e.message);
        return [];
      }),
      fetchRides(SUPA_URL, SUPA_KEY).catch((e) => {
        console.warn("[sitemap] rides fetch failed:", e.message);
        return [];
      }),
    ]);

    for (const p of products) {
      urls.push({
        loc: `/product/${p.id}`,
        lastmod: p.updated_at ? new Date(p.updated_at).toISOString() : undefined,
        changefreq: "weekly",
        priority: "0.8",
      });
    }
    for (const r of rides) {
      urls.push({
        loc: `/rides/${r.id}`,
        lastmod: r.updated_at ? new Date(r.updated_at).toISOString() : undefined,
        changefreq: "daily",
        priority: "0.7",
      });
    }

    writeSitemap(urls);
  } catch (err) {
    console.warn("[sitemap] generation failed, writing static fallback:", err?.message || err);
    writeSitemap(urls);
  }
};

main().catch((err) => {
  console.warn("[sitemap] unexpected error, writing static fallback:", err?.message || err);
  try {
    writeSitemap(buildStaticUrls());
  } catch {}
  process.exit(0);
});
