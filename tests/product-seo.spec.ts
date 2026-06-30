import { test, expect, type Page } from "../playwright-fixture";

import { SITE_URL } from "../src/lib/seoImage";

const SITE = SITE_URL;

async function getMetaContent(page: Page, selector: string) {
  return page.locator(selector).first().getAttribute("content");
}
async function getCanonicalHref(page: Page) {
  return page.locator('link[rel="canonical"]').first().getAttribute("href");
}
function expectAbsoluteHttpUrl(value: string | null) {
  expect(value).toBeTruthy();
  expect(value!).not.toContain("undefined");
  expect(value!).not.toContain("null");
  const url = new URL(value!);
  expect(["http:", "https:"]).toContain(url.protocol);
}

const VALID_PRODUCT = {
  id: "11111111-2222-3333-4444-555555555555",
  title: "iPhone 13 Pro Max",
  description: "Excellent condition iPhone 13 Pro Max",
  price: 800,
  currency: "EUR",
  category: "phones",
  condition: "used",
  image_urls: ["https://cdn.example.com/iphone-1.jpg", "https://cdn.example.com/iphone-2.jpg"],
  status: "active",
  vertical: "market",
  contact_method: "chat",
  listing_type: "free",
  is_boosted: false,
  boost_expires_at: null,
  expires_at: null,
  auto_renew: false,
  country: "AL",
  city: "Tirana",
  seller_id: "00000000-0000-0000-0000-000000000001",
  created_at: new Date().toISOString(),
};

const NO_IMAGE_PRODUCT = {
  ...VALID_PRODUCT,
  id: "99999999-8888-7777-6666-555555555555",
  title: "Listing With No Image",
  image_urls: ["", "/relative.png", "not-a-url"],
};

const PROFILE = {
  user_id: "00000000-0000-0000-0000-000000000001",
  display_name: "Seller",
  avatar_url: null,
  phone_number: null,
  whatsapp_enabled: false,
  viber_enabled: false,
};

async function mockSupabase(page: Page, product: typeof VALID_PRODUCT) {
  await page.route("**/rest/v1/products**", async (route) => {
    const url = route.request().url();
    // single product fetch
    if (url.includes(`id=eq.${product.id}`) || url.includes("limit=1") || url.includes("select=*")) {
      // useProduct uses .single()
      if (url.includes(`id=eq.${product.id}`)) {
        return route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(product),
          headers: { "Content-Range": "0-0/1" },
        });
      }
    }
    return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
  });
  await page.route("**/rest/v1/profiles**", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(PROFILE),
    }),
  );
  // catch other supabase tables to avoid hangs
  await page.route("**/rest/v1/**", (route) =>
    route.fulfill({ status: 200, contentType: "application/json", body: "[]" }),
  );
}

async function assertProductMeta(page: Page, product: typeof VALID_PRODUCT, expectFallbackImage: boolean) {
  // Wait for SEO effect to populate canonical
  await page.waitForFunction(() => !!document.querySelector('link[rel="canonical"]'));
  await page.waitForFunction(
    (id) => document.querySelector('link[rel="canonical"]')?.getAttribute("href")?.includes(id),
    product.id,
    { timeout: 5000 },
  ).catch(() => {});

  const canonical = await getCanonicalHref(page);
  const ogUrl = await getMetaContent(page, 'meta[property="og:url"]');
  const twUrl = await getMetaContent(page, 'meta[name="twitter:url"]');
  const ogImage = await getMetaContent(page, 'meta[property="og:image"]');
  const twImage = await getMetaContent(page, 'meta[name="twitter:image"]');

  expectAbsoluteHttpUrl(canonical);
  expectAbsoluteHttpUrl(ogUrl);
  expectAbsoluteHttpUrl(twUrl);
  expect(canonical).toBe(ogUrl);
  expect(canonical).toBe(twUrl);
  expect(canonical).toContain("/p/");

  expectAbsoluteHttpUrl(ogImage);
  expectAbsoluteHttpUrl(twImage);
  expect(ogImage).toBe(twImage);

  if (expectFallbackImage) {
    expect(ogImage).toBe(`${SITE}/og-image.png`);
  } else {
    expect(ogImage).toBe(product.image_urls[0]);
  }
}

test.describe("Product SEO meta tags", () => {
  test("/p/:slug — valid image", async ({ page }) => {
    await mockSupabase(page, VALID_PRODUCT);
    await page.goto(`/p/iphone-13-pro-max-${VALID_PRODUCT.id}`);
    await assertProductMeta(page, VALID_PRODUCT, false);
  });

  test("/product/:id — valid image", async ({ page }) => {
    await mockSupabase(page, VALID_PRODUCT);
    await page.goto(`/product/${VALID_PRODUCT.id}`);
    await assertProductMeta(page, VALID_PRODUCT, false);
  });

  test("falls back to default OG image when product has no valid images", async ({ page }) => {
    await mockSupabase(page, NO_IMAGE_PRODUCT);
    await page.goto(`/product/${NO_IMAGE_PRODUCT.id}`);
    await assertProductMeta(page, NO_IMAGE_PRODUCT, true);
  });
});
