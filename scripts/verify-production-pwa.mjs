import { chromium } from "playwright";

const BASE = process.env.PROD_URL || "https://www.shpalljet.net";

const browser = await chromium.launch({ headless: true });
const results = { base: BASE, checks: {}, consoleErrors: [], pass: false };

const page = await browser.newPage({
  userAgent:
    "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36",
});

page.on("console", (msg) => {
  if (msg.type() === "error") results.consoleErrors.push(msg.text());
});

// Homepage loads
const homeResp = await page.goto(`${BASE}/`, { waitUntil: "networkidle", timeout: 60000 });
results.checks.homeStatus = homeResp?.status() ?? 0;

// Manifest
const manifestResp = await page.goto(`${BASE}/manifest.webmanifest`);
const manifest = await manifestResp?.json();
results.checks.manifest = {
  status: manifestResp?.status(),
  display: manifest?.display,
  hasIcons: manifest?.icons?.length >= 3,
};

// SW
await page.goto(`${BASE}/`);
results.checks.swRegistered = await page.evaluate(async () => {
  if (!("serviceWorker" in navigator)) return false;
  await new Promise((r) => setTimeout(r, 4000));
  const reg = await navigator.serviceWorker.getRegistration();
  return !!reg?.active;
});

// Install banner when prompt available
await page.goto(`${BASE}/`);
await page.evaluate(() => {
  const event = new Event("beforeinstallprompt");
  event.preventDefault = () => {};
  event.prompt = async () => {};
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  window.dispatchEvent(event);
});
await page.waitForTimeout(800);
results.checks.homepageBanner = {
  visible: await page.locator('[data-testid="install-banner"]').isVisible().catch(() => false),
  cta: await page.locator('[data-testid="install-banner-cta"]').isVisible().catch(() => false),
};

// /install page
await page.goto(`${BASE}/install`, { waitUntil: "networkidle", timeout: 60000 });
results.checks.installPageStatus = (await page.goto(`${BASE}/install`))?.status() ?? 0;
await page.evaluate(() => {
  const event = new Event("beforeinstallprompt");
  event.preventDefault = () => {};
  event.prompt = async () => {};
  event.userChoice = Promise.resolve({ outcome: "accepted" });
  window.dispatchEvent(event);
});
await page.waitForTimeout(500);
results.checks.installPageButton = await page
  .getByRole("button", { name: /Install Shpalljet/i })
  .isVisible()
  .catch(() => false);

// /login loads (no ~oauth)
const loginResp = await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 60000 });
results.checks.loginStatus = loginResp?.status() ?? 0;
results.checks.loginNoOauth = !page.url().includes("~oauth");

// Bundle has InstallBanner
results.checks.hasInstallBannerInBundle = await page.evaluate(async (base) => {
  const html = await (await fetch(base + "/")).text();
  const scripts = [...html.matchAll(/src="(\/assets\/[^"]+\.js)"/g)].map((m) => m[1]);
  for (const src of scripts) {
    const js = await (await fetch(base + src)).text();
    if (js.includes("install-banner") || js.includes("InstallBanner")) return true;
  }
  return false;
}, BASE);

results.pass =
  results.checks.homeStatus === 200 &&
  results.checks.manifest?.status === 200 &&
  results.checks.swRegistered &&
  results.checks.homepageBanner?.visible &&
  results.checks.installPageStatus === 200 &&
  results.checks.loginStatus === 200 &&
  results.checks.loginNoOauth &&
  results.checks.hasInstallBannerInBundle &&
  results.consoleErrors.length === 0;

console.log(JSON.stringify(results, null, 2));
await browser.close();
process.exit(results.pass ? 0 : 1);
