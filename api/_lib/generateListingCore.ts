import { GoogleGenAI, ThinkingLevel } from "@google/genai";
import { parseGeminiListingJson, type GeminiListingResult } from "../../src/lib/geminiListingSchema.js";

const PRIMARY_MODEL = "gemini-3-flash-preview";
const FALLBACK_MODEL = "gemini-2.5-flash";

export const GEMINI_LISTING_SYSTEM_INSTRUCTION = `You are Shpalljet AI, an expert Albanian marketplace assistant specializing in SEO.

Analyze uploaded product images and create a high-quality classified listing for Shpalljet, an Albanian marketplace.

LANGUAGE (mandatory — always Albanian):
- Write ALL user-visible generated text in Albanian (Shqip) only.
- Default and required output language is Albanian for every descriptive field.
- Never output English for titles, descriptions, condition labels, colors, features, specifications, keywords, tags, meta text, or image alt text — even if seller notes request another language or locale.
- Keep official brand names, model names, and established technical product names unchanged in their standard form (e.g. Apple, iPhone 11, Samsung, Toyota, BMW, Face ID, iOS, A13 Bionic, OLED, 5G, 128GB).
- Translate descriptive values into natural Albanian. Examples:
  - Good Condition -> Gjendje e mirë
  - Yellow -> E verdhë
  - Wireless charging -> Karikim pa tela
  - Dual-camera system -> Sistem me dy kamera
- For the condition field only, output exactly one slug (not English prose): new | like-new | good | used | for-parts
- If a value is unknown, use "E panjohur" (never "Unknown").

Goals:
- Maximize marketplace search visibility in Albanian.
- Produce content suitable for Google Search in Albanian.
- Be accurate and never invent facts.

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

function getGeminiErrorStatus(err: unknown): number | undefined {
  return (
    (err as { status?: number })?.status ??
    (err as { error?: { code?: number } })?.error?.code
  );
}

export function isGeminiUnavailableError(err: unknown): boolean {
  const status = getGeminiErrorStatus(err);
  if (status === 503) return true;

  const nestedError = (err as { error?: Record<string, unknown> })?.error;
  if (nestedError?.code === 503) return true;
  if (nestedError?.status === "UNAVAILABLE") return true;

  const message = err instanceof Error ? err.message : String(err);
  const parsedMessage = tryParseJsonMessage(message);
  if (parsedMessage && typeof parsedMessage === "object" && parsedMessage !== null) {
    const errorObj = (parsedMessage as { error?: Record<string, unknown> }).error;
    if (errorObj?.code === 503) return true;
    if (errorObj?.status === "UNAVAILABLE") return true;
  }

  return /503|unavailable/i.test(message);
}

function buildGenerateConfig(model: string) {
  const config = {
    systemInstruction: GEMINI_LISTING_SYSTEM_INSTRUCTION,
    temperature: 0.4,
    responseMimeType: "application/json" as const,
  };

  if (model === PRIMARY_MODEL) {
    return {
      ...config,
      thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
    };
  }

  return config;
}

type ContentPart = { text?: string; inlineData?: { mimeType: string; data: string } };

async function generateListingText(
  ai: GoogleGenAI,
  model: string,
  parts: ContentPart[],
): Promise<string> {
  const response = await ai.models.generateContent({
    model,
    contents: { role: "user", parts },
    config: buildGenerateConfig(model),
  });

  const text = response.text?.trim();
  if (!text) {
    throw new Error("empty_response");
  }

  return text;
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

  const parts: ContentPart[] = [];

  if (input.userText?.trim()) {
    parts.push({
      text: `Shënime nga shitësi (përdori vetëm si kontekst; mos kopjo gjuhën e shënimeve — gjithë listimi duhet të jetë në shqip): ${input.userText.trim()}`,
    });
  }

  parts.push({
    text: "Analizo fotot e ngarkuara të produktit dhe kthe JSON-in e listimit. Të gjitha tekstet e dukshme për përdoruesin duhet të jenë vetëm në shqip.",
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
    const text = await generateListingText(ai, PRIMARY_MODEL, parts);
    return parseGeminiListingJson(text);
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "empty_response") throw err;
      if (err.message === "rate_limit" || err.message === "gemini_auth") throw err;
    }

    if (isGeminiUnavailableError(err)) {
      logOriginalGeminiSdkError(err);
      console.error(
        `Gemini primary model unavailable (${PRIMARY_MODEL}), retrying with ${FALLBACK_MODEL}`,
      );

      try {
        const text = await generateListingText(ai, FALLBACK_MODEL, parts);
        return parseGeminiListingJson(text);
      } catch (fallbackErr) {
        if (fallbackErr instanceof Error) {
          if (fallbackErr.message === "empty_response") throw fallbackErr;
          if (fallbackErr.message === "rate_limit" || fallbackErr.message === "gemini_auth") {
            throw fallbackErr;
          }
        }
        logOriginalGeminiSdkError(fallbackErr);
        mapGeminiError(fallbackErr);
      }
    }

    logOriginalGeminiSdkError(err);
    mapGeminiError(err);
  }
}
