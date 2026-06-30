import { GoogleGenAI } from "@google/genai";
import { parseGeminiListingJson, type GeminiListingResult } from "../../src/lib/geminiListingSchema.js";

const MODEL = "models/gemini-3-flash-preview";

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

const GENERATION_CONFIG = {
  temperature: 0.4,
  max_output_tokens: 65536,
  topP: 0.95,
  thinkingLevel: "high" as const,
};

export interface GenerateListingInput {
  images: Array<{ data: string; mimeType?: string }>;
  userText?: string;
}

function stripDataUrl(data: string): string {
  return data.replace(/^data:image\/\w+;base64,/, "");
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

  console.error("Gemini SDK error:", err);
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

  const interactionInput: Array<
    | { type: "text"; text: string }
    | { type: "image"; data: string; mime_type: string }
  > = [];

  if (input.userText?.trim()) {
    interactionInput.push({
      type: "text",
      text: `Seller notes: ${input.userText.trim()}`,
    });
  }

  interactionInput.push({
    type: "text",
    text: "Analyze the uploaded product images and return the listing JSON.",
  });

  for (const img of input.images) {
    interactionInput.push({
      type: "image",
      data: stripDataUrl(img.data),
      mime_type: img.mimeType || "image/jpeg",
    });
  }

  try {
    const interaction = await ai.interactions.create({
      model: MODEL,
      input: interactionInput,
      system_instruction: SYSTEM_INSTRUCTION,
      generation_config: GENERATION_CONFIG,
    });

    const text = interaction.output_text?.trim();
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
