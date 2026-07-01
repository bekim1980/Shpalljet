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
    .replace(/GEMINI_API_KEY[=:\s]+\S+/gi, "GEMINI_API_KEY=[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
}

const SENSITIVE_LOG_KEYS = new Set([
  "apikey",
  "api_key",
  "apikeystring",
  "authorization",
  "x-goog-api-key",
]);

function sanitizeForLogValue(value: unknown, depth = 0): unknown {
  if (depth > 5) return "[Max depth]";
  if (value == null || typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (typeof value === "string") return sanitizeForLog(value);
  if (value instanceof Error) {
    return {
      name: value.name,
      message: sanitizeForLog(value.message),
      stack: value.stack ? sanitizeForLog(value.stack) : undefined,
      status: (value as { status?: number }).status,
      code: (value as { code?: string | number }).code,
    };
  }
  if (Array.isArray(value)) {
    return value.map((item) => sanitizeForLogValue(item, depth + 1));
  }
  if (typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(value)) {
      if (SENSITIVE_LOG_KEYS.has(key.toLowerCase())) {
        out[key] = "[REDACTED]";
        continue;
      }
      out[key] = sanitizeForLogValue(val, depth + 1);
    }
    return out;
  }
  return sanitizeForLog(String(value));
}

function tryParseJsonMessage(message: string): unknown | undefined {
  try {
    return JSON.parse(message) as unknown;
  } catch {
    return undefined;
  }
}

function logOriginalGeminiSdkError(err: unknown): void {
  const status =
    (err as { status?: number })?.status ??
    (err as { error?: { code?: number } })?.error?.code;

  const nestedError = (err as { error?: Record<string, unknown> })?.error;

  const code =
    (err as { code?: string | number })?.code ??
    nestedError?.code ??
    (typeof nestedError?.status === "string" ? nestedError.status : undefined);

  const message =
    err instanceof Error
      ? err.message
      : typeof err === "string"
        ? err
        : undefined;

  const stack = err instanceof Error ? err.stack : undefined;

  const parsedMessage = message ? tryParseJsonMessage(message) : undefined;
  const responseBody =
    parsedMessage && typeof parsedMessage === "object" && parsedMessage !== null
      ? (parsedMessage as { error?: unknown }).error ?? parsedMessage
      : nestedError;

  const details = (err as { details?: unknown })?.details;
  const cause = (err as { cause?: unknown })?.cause;
  const response = (err as { response?: unknown })?.response;

  console.error(
    "Gemini SDK error (original):",
    sanitizeForLogValue({
      message: message ? sanitizeForLog(message) : undefined,
      status,
      code,
      stack: stack ? sanitizeForLog(stack) : undefined,
      name: err instanceof Error ? err.name : undefined,
      responseBody,
      details,
      cause,
      response,
    }),
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
    logOriginalGeminiSdkError(err);
    mapGeminiError(err);
  }
}
