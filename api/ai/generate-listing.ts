import type { VercelRequest, VercelResponse } from "@vercel/node";
import { generateListingFromGemini } from "../_lib/generateListingCore.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") {
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
    const images: string[] = body?.images ?? [];
    const userText: string | undefined = body?.userText ?? body?.user_text;
    const mimeTypes: string[] | undefined = body?.mimeTypes;

    const listing = await generateListingFromGemini({
      images: images.map((data, i) => ({
        data,
        mimeType: mimeTypes?.[i] ?? "image/jpeg",
      })),
      userText,
    });

    return res.status(200).json({ listing });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    if (msg === "rate_limit") return res.status(429).json({ error: "Rate limit exceeded" });
    if (msg === "GEMINI_API_KEY not configured") {
      return res.status(503).json({ error: "AI service not configured" });
    }
    if (msg.includes("Maximum") || msg.includes("At least one")) {
      return res.status(400).json({ error: msg });
    }
    console.error("generate-listing error:", e);
    return res.status(500).json({ error: "Failed to generate listing" });
  }
}
