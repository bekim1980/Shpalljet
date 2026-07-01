import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateContent = vi.fn();

vi.mock("@google/genai", () => ({
  GoogleGenAI: vi.fn(() => ({
    models: { generateContent: mockGenerateContent },
  })),
  ThinkingLevel: { HIGH: "HIGH" },
}));

import {
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
