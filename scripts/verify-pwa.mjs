import { chromium } from "playwright";

const BASE = "http://127.0.0.1:4173";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext();
const page = await ctx.newPage();

const manifestResp = await page.goto(`${BASE}/manifest.webmanifest`);
const manifest = await manifestResp.json();
const iconsOk =
  manifest.icons?.some((i) => i.sizes === "192x192") &&
  manifest.icons?.some((i) => i.sizes === "512x512" && i.purpose === "any") &&
  manifest.icons?.some((i) => i.purpose === "maskable");

await page.goto(BASE);
const swRegistered = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return false;
  await new Promise((r) => setTimeout(r, 3000));
  const reg = await navigator.serviceWorker.getRegistration();
  return !!reg?.active;
});

const installable = await page.evaluate(() => {
  const m = document.querySelector('link[rel="manifest"]');
  const apple = document.querySelector('link[rel="apple-touch-icon"]');
  const capable = document.querySelector('meta[name="apple-mobile-web-app-capable"]');
  const viewport = document.querySelector('meta[name="viewport"]')?.getAttribute("content") || "";
  return {
    hasManifest: !!m,
    hasAppleIcon: !!apple,
    appleCapable: capable?.getAttribute("content") === "yes",
    viewportFit: viewport.includes("viewport-fit=cover"),
  };
});

const iconChecks = await page.evaluate(async (base) => {
  const paths = ["/pwa-icon-192.png", "/pwa-icon-512.png", "/pwa-icon-maskable-512.png", "/apple-touch-icon.png", "/offline.html"];
  const out = [];
  for (const p of paths) {
    const r = await fetch(base + p);
    out.push({ path: p, ok: r.ok });
  }
  return out;
}, BASE);

console.log(JSON.stringify({ manifest: { id: manifest.id, iconsOk }, swRegistered, installable, iconChecks }, null, 2));
await browser.close();
