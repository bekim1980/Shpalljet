import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { parseGeminiListingJson, type GeminiListingResult } from "../../src/lib/geminiListingSchema.js";

const MODEL = "gemini-3-flash-preview";

const SYSTEM_INSTRUCTION = `You are Shpalljet AI, an expert marketplace assistant specializing in SEO.

Analyze uploaded product images and create a high-quality classified listing.

Goals:
- Maximize marketplace search visibility.
- Produce content that is also suitable for Google Search.
- Be accurate and never invent facts.

If unknown, return "Unknown".
Return ONLY valid JSON.

{
  "seo_title": "",
  "marketplace_title": "",
  "category": "",
  "subcategory": "",
  "brand": "",
  "model": "",
  "condition": "",
  "color": "",
  "description": "",
  "features": [],
  "keywords": [],
  "tags": [],
  "url_slug": "",
  "meta_title": "",
  "meta_description": "",
  "image_alt_text": "",
  "price_estimate": ""
}`;

export interface GenerateListingInput {
  images: Array<{ data: string; mimeType?: string }>;
  userText?: string;
}

function stripDataUrl(data: string): string {
  return data.replace(/^data:image\/\w+;base64,/, "");
}

function sanitizeForLog(text: string): string {
  return text
    .replace(/AIza[A-Za-z0-9_-]{20,}/g, "[REDACTED_API_KEY]")
    .replace(/GEMINI_API_KEY[=:\s]+\S+/gi, "GEMINI_API_KEY=[REDACTED]");
}

function logGeminiError(err: unknown): void {
  const status =
    (err as { status?: number })?.status ??
    (err as { error?: { code?: number } })?.error?.code;

  const message =
    err instanceof Error
      ? sanitizeForLog(`${err.name}: ${err.message}`)
      : sanitizeForLog(String(err));

  console.error(
    "Gemini API error:",
    [message, status ? `status=${status}` : null].filter(Boolean).join(" | "),
  );
}

function mapGeminiError(err: unknown): never {
  const status =
    (err as { status?: number })?.status ??
    (err as { error?: { code?: number } })?.error?.code;

  if (status === 429) throw new Error("rate_limit");
  if (status === 403 || status === 401) throw new Error("gemini_auth");

  const message = err instanceof Error ? err.message : String(err);
  if (/429|rate.?limit/i.test(message)) throw new Error("rate_limit");
  if (/403|401|api.?key|permission/i.test(message)) throw new Error("gemini_auth");

  logGeminiError(err);
  throw new Error("gemini_error");
}

export async function generateListingFromGemini(
  input: GenerateListingInput,
): Promise<GeminiListingResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  if (!input.images?.length) {
    throw new Error("At least one image is required");
  }
  if (input.images.length > 10) {
    throw new Error("Maximum 10 images allowed");
  }

  const ai = new GoogleGenAI({ apiKey });

  const parts: Array<{ text?: string; inlineData?: { mimeType: string; data: string } }> =
    [];

  if (input.userText?.trim()) {
    parts.push({ text: `Seller notes: ${input.userText.trim()}` });
  }

  parts.push({
    text: "Analyze the uploaded product images and return the listing JSON.",
  });

  for (const img of input.images) {
    parts.push({
      inlineData: {
        mimeType: img.mimeType || "image/jpeg",
        data: stripDataUrl(img.data),
      },
    });
  }

  try {
    const response = await ai.models.generateContent({
      model: MODEL,
      contents: { role: "user", parts },
      config: {
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.4,
        responseMimeType: "application/json",
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
      },
    });

    const text = response.text?.trim();
    if (!text) {
      throw new Error("empty_response");
    }

    return parseGeminiListingJson(text);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "empty_response") throw err;
      if (err.message === "rate_limit" || err.message === "gemini_auth") throw err;
    }
    mapGeminiError(err);
  }
}
