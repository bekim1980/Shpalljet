import { chromium } from "playwright";

const BASE = process.env.PREVIEW_URL || "http://127.0.0.1:4173";

const browser = await chromium.launch({ headless: true });
const ctx = await browser.newContext({
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
});
const page = await ctx.newPage();

const consoleErrors = [];
page.on("console", (msg) => {
  if (msg.type() === "error") consoleErrors.push(msg.text());
});

// Manifest
const manifestResp = await page.goto(`${BASE}/manifest.webmanifest`);
const manifestStatus = manifestResp?.status() ?? 0;
const manifest = await manifestResp.json();

const manifestChecks = {
  status200: manifestStatus === 200,
  name: Boolean(manifest.name),
  short_name: Boolean(manifest.short_name),
  display: manifest.display === "standalone",
  start_url: manifest.start_url === "/",
  scope: manifest.scope === "/",
  id: manifest.id === "/",
  theme_color: manifest.theme_color === "#0a0a0a",
  background_color: manifest.background_color === "#0a0a0a",
  icons:
    manifest.icons?.some((i) => i.sizes === "192x192") &&
    manifest.icons?.some((i) => i.sizes === "512x512"),
  maskable: manifest.icons?.some((i) => i.purpose === "maskable"),
};

// Service worker
await page.goto(BASE);
const swRegistered = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return false;
  await new Promise((r) => setTimeout(r, 3000));
  const reg = await navigator.serviceWorker.getRegistration();
  return !!reg?.active;
});

// Install page — no infinite preparing state
await page.goto(`${BASE}/install`);
const preparingBefore = await page.getByRole("button", { name: /Preparing install/i }).count();
await page.waitForTimeout(3500);
const preparingAfter = await page.getByRole("button", { name: /Preparing install/i }).count();
const shareVisible = await page.getByRole("button", { name: /Share link to your phone/i }).isVisible();

// beforeinstallprompt → enabled Install button (within 3s window)
const promptPage = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
});
await promptPage.goto(`${BASE}/install`);
await promptPage.evaluate(() => {
  const event = new Event("beforeinstallprompt");
  event.preventDefault = () => {};
  event.prompt = async () => {};
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  window.dispatchEvent(event);
});
await promptPage.waitForTimeout(500);
const promptResult = await promptPage.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    /Install Shpalljet/i.test(b.textContent || ""),
  );
  return { hasInstallButton: !!btn, enabled: btn ? !btn.disabled : false };
});

// SPA navigation retains captured prompt (homepage → install)
const spaPage = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
});
await spaPage.goto(`${BASE}/`);
await spaPage.evaluate(() => {
  const event = new Event("beforeinstallprompt");
  event.preventDefault = () => {};
  event.prompt = async () => {};
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  window.dispatchEvent(event);
});
await spaPage.evaluate(() => {
  window.history.pushState({}, "", "/install");
  window.dispatchEvent(new PopStateEvent("popstate"));
});
await spaPage.waitForTimeout(500);
const spaPrompt = await spaPage.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) =>
    /Install Shpalljet/i.test(b.textContent || ""),
  );
  return { hasInstallButton: !!btn, enabled: btn ? !btn.disabled : false };
});

// Desktop Chrome — 3s timeout then manual instructions
const desktopPage = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
});
await desktopPage.goto(`${BASE}/install`);
await desktopPage.waitForTimeout(3500);
const desktopResult = await desktopPage.evaluate(() => ({
  shareVisible: [...document.querySelectorAll("button")].some((b) =>
    /Share link to your phone/i.test(b.textContent || ""),
  ),
  preparingGone: ![...document.querySelectorAll("button")].some((b) =>
    /Preparing install/i.test(b.textContent || ""),
  ),
}));

// Homepage install banner when beforeinstallprompt fires
const bannerPage = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
});
await bannerPage.goto(`${BASE}/`);
await bannerPage.evaluate(() => {
  const event = new Event("beforeinstallprompt");
  event.preventDefault = () => {};
  event.prompt = async () => {};
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  window.dispatchEvent(event);
});
await bannerPage.waitForTimeout(500);
const bannerResult = await bannerPage.evaluate(() => ({
  bannerVisible: !!document.querySelector('[data-testid="install-banner"]'),
  ctaVisible: !!document.querySelector('[data-testid="install-banner-cta"]'),
}));

// Standalone detection on fresh load
const standalonePage = await browser.newPage();
await standalonePage.addInitScript(() => {
  const mq = window.matchMedia("(display-mode: standalone)");
  Object.defineProperty(mq, "matches", { configurable: true, value: true });
  Object.defineProperty(window.navigator, "standalone", { configurable: true, value: true });
});
await standalonePage.goto(`${BASE}/install`);
await standalonePage.waitForTimeout(800);
const standaloneResult = await standalonePage.evaluate(() => ({
  heading: document.querySelector("h2")?.textContent || "",
  installHidden: ![...document.querySelectorAll("button")].some((b) =>
    /Install Shpalljet|Preparing install/i.test(b.textContent || ""),
  ),
}));

// Images
await page.goto(BASE);
await page.waitForTimeout(2000);
const imageChecks = await page.evaluate(async (base) => {
  const placeholder = await fetch(base + "/placeholder.svg");
  const imgs = [...document.querySelectorAll("img")];
  const broken = imgs.filter((img) => img.naturalWidth === 0 && img.src && !img.src.includes("placeholder"));
  return {
    placeholderOk: placeholder.ok,
    totalImages: imgs.length,
    brokenCount: broken.length,
    brokenSrcs: broken.slice(0, 5).map((i) => i.src),
  };
}, BASE);

const result = {
  manifestChecks,
  swRegistered,
  installFlow: {
    preparingBefore,
    preparingAfter,
    shareVisibleAfterTimeout: shareVisible,
    noInfinitePreparing: preparingAfter === 0,
    promptCapture: promptResult,
    spaPromptRetention: spaPrompt,
    desktopChrome: desktopResult,
    homepageBanner: bannerResult,
    standalone: standaloneResult,
  },
  imageChecks,
  consoleErrors: consoleErrors.slice(0, 10),
  pass:
    manifestChecks.status200 &&
    manifestChecks.name &&
    manifestChecks.short_name &&
    manifestChecks.maskable &&
    swRegistered &&
    shareVisible &&
    preparingAfter === 0 &&
    promptResult.hasInstallButton &&
    promptResult.enabled &&
    spaPrompt.hasInstallButton &&
    spaPrompt.enabled &&
    standaloneResult.heading.includes("already installed") &&
    standaloneResult.installHidden &&
    desktopResult.shareVisible &&
    desktopResult.preparingGone &&
    bannerResult.bannerVisible &&
    bannerResult.ctaVisible &&
    imageChecks.placeholderOk,
};

console.log(JSON.stringify(result, null, 2));
await browser.close();
process.exit(result.pass ? 0 : 1);
