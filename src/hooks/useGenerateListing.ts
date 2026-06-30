import { useCallback, useState } from "react";
import { filesToBase64Images } from "@/lib/compressImageForAi";
import { parseGeminiListingJson, type GeminiListingResult } from "@/lib/geminiListingSchema";

const ENDPOINT = "/api/ai/generate-listing";

export type GenerateListingError = "failed" | "rate_limit" | "not_configured" | "validation";

export function useGenerateListing() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<GenerateListingError | null>(null);
  const [result, setResult] = useState<GeminiListingResult | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setResult(null);
  }, []);

  const generate = useCallback(async (files: File[], userText?: string) => {
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const images = await filesToBase64Images(files);
      const mimeTypes = files.map((f) => f.type || "image/jpeg");

      const resp = await fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ images, mimeTypes, userText }),
      });

      if (resp.status === 429) {
        setError("rate_limit");
        return null;
      }
      if (resp.status === 503) {
        setError("not_configured");
        return null;
      }
      if (!resp.ok) {
        setError("failed");
        return null;
      }

      const data = await resp.json();
      const listing = parseGeminiListingJson(data.listing ?? data);
      setResult(listing);
      return listing;
    } catch (e) {
      if (import.meta.env.DEV) console.debug("[generate-listing] client error", e);
      setError("validation");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, result, generate, reset };
}
