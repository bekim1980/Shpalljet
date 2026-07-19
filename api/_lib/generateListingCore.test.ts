import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  ThinkingLevel: { HIGH: "HIGH" },
}));

import {
  GEMINI_LISTING_SYSTEM_INSTRUCTION,
  generateListingFromGemini,
  isGeminiUnavailableError,
} from "./generateListingCore";

const validListing = {
  seo_title: "Test Item",
  marketplace_title: "Test Item for Sale",
  category: "electronics",
  subcategory: "phones",
  brand: "Unknown",
  model: "Unknown",
  condition: "good",
  color: "black",
  description: "A test listing.",
  features: ["feature one"],
  keywords: ["test"],
  tags: ["test"],
  url_slug: "test-item",
  meta_title: "Test Item",
  meta_description: "Buy a test item.",
  image_alt_text: "Test item photo",
  price_estimate: "50 EUR",
};

function makeApiError(status: number, errorBody: Record<string, unknown>) {
  const err = new Error(JSON.stringify({ error: errorBody }));
  err.name = "ApiError";
  (err as { status: number }).status = status;
  return err;
}

const input = {
  images: [{ data: "aGVsbG8=", mimeType: "image/jpeg" }],
};

describe("GEMINI_LISTING_SYSTEM_INSTRUCTION", () => {
  it("requires Albanian-only user-visible output", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/Albanian \(Shqip\)/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/Never output English/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/even if seller notes/i);
  });

  it("includes Albanian translation examples", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("Gjendje e mirë");
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("E verdhë");
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("Karikim pa tela");
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("Sistem me dy kamera");
  });

  it("preserves brand and technical names", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("Apple");
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("iPhone 11");
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("Face ID");
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("A13 Bionic");
  });

  it("keeps JSON schema fields unchanged", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain('"seo_title"');
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain('"price_estimate"');
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain('"features": []');
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain('"attributes": {}');
  });

  it("requires category-specific attributes from catalog keys", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/CATEGORY-SPECIFIC ATTRIBUTES/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("electronics-phones:");
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("Never guess or invent attribute values");
  });

  it("requires zero hallucinations and visible-only facts", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/ZERO HALLUCINATIONS/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/NEVER invent/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/authenticity/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/nuk mund të konfirmohet/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/duket se/i);
  });

  it("restricts antique and original claims", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/antike, origjinale, autentike/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/me stil/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/dekorative/i);
  });

  it("limits features to short factual bullets", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/Maximum 8 items/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/Maximum 8 words per item/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/No marketing text/i);
  });

  it("requires natural description and cautious titles", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("Ofrohet për shitje");
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/Medalje Dekorative me Stil Osman/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/Do not exaggerate/i);
  });

  it("restricts material and historical claims", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/me ngjyrë ari/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/sultans, kings, emperors/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toContain("Kostantiniyye 1293");
  });

  it("guides keywords, tags, and category selection", () => {
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/metadata only/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/most specific category/i);
    expect(GEMINI_LISTING_SYSTEM_INSTRUCTION).toMatch(/truthful listing/i);
  });
});

describe("isGeminiUnavailableError", () => {
  it("detects ApiError with status 503", () => {
    expect(isGeminiUnavailableError(makeApiError(503, { status: "UNAVAILABLE" }))).toBe(true);
  });

  it("detects UNAVAILABLE in parsed message body", () => {
    const err = new Error(
      JSON.stringify({
        error: { code: 503, status: "UNAVAILABLE", message: "Model overloaded" },
      }),
    );
    expect(isGeminiUnavailableError(err)).toBe(true);
  });

  it("does not treat 429 as unavailable", () => {
    expect(isGeminiUnavailableError(makeApiError(429, { status: "RESOURCE_EXHAUSTED" }))).toBe(
      false,
    );
  });
});

describe("generateListingFromGemini", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GEMINI_API_KEY = "test-key";
  });

  it("uses primary model on success", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(validListing) });

    const result = await generateListingFromGemini(input);

    expect(result.marketplace_title).toBe(validListing.marketplace_title);
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
    expect(mockGenerateContent.mock.calls[0][0].model).toBe("gemini-3-flash-preview");
    expect(mockGenerateContent.mock.calls[0][0].config.systemInstruction).toBe(
      GEMINI_LISTING_SYSTEM_INSTRUCTION,
    );
  });

  it("sends Albanian-only instructions in the user message", async () => {
    mockGenerateContent.mockResolvedValueOnce({ text: JSON.stringify(validListing) });

    await generateListingFromGemini({
      images: input.images,
      userText: "Please write this listing in English",
    });

    const parts = mockGenerateContent.mock.calls[0][0].contents.parts as Array<{ text?: string }>;
    const userTexts = parts.filter((p) => p.text).map((p) => p.text!);
    expect(userTexts.some((t) => /shqip/i.test(t))).toBe(true);
    expect(userTexts.some((t) => /gjithë listimi duhet të jetë në shqip/i.test(t))).toBe(true);
    expect(userTexts.some((t) => /Mos shpik fakte/i.test(t))).toBe(true);
    expect(userTexts.some((t) => t.includes("Please write this listing in English"))).toBe(true);
  });

  it("retries with fallback model after 503 UNAVAILABLE", async () => {
    mockGenerateContent
      .mockRejectedValueOnce(makeApiError(503, { status: "UNAVAILABLE", message: "High demand" }))
      .mockResolvedValueOnce({ text: JSON.stringify(validListing) });

    const result = await generateListingFromGemini(input);

    expect(result.seo_title).toBe(validListing.seo_title);
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
    expect(mockGenerateContent.mock.calls[0][0].model).toBe("gemini-3-flash-preview");
    expect(mockGenerateContent.mock.calls[1][0].model).toBe("gemini-2.5-flash");
    expect(mockGenerateContent.mock.calls[1][0].config).not.toHaveProperty("thinkingConfig");
  });

  it("throws gemini_error when fallback also fails", async () => {
    mockGenerateContent
      .mockRejectedValueOnce(makeApiError(503, { status: "UNAVAILABLE" }))
      .mockRejectedValueOnce(makeApiError(500, { status: "INTERNAL", message: "Server error" }));

    await expect(generateListingFromGemini(input)).rejects.toThrow("gemini_error");
    expect(mockGenerateContent).toHaveBeenCalledTimes(2);
  });

  it("does not retry on rate limit", async () => {
    mockGenerateContent.mockRejectedValueOnce(makeApiError(429, { status: "RESOURCE_EXHAUSTED" }));

    await expect(generateListingFromGemini(input)).rejects.toThrow("rate_limit");
    expect(mockGenerateContent).toHaveBeenCalledTimes(1);
  });
});
