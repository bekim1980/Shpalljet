import { useState, useCallback, useRef } from "react";
import { filesToBase64Images } from "@/lib/compressImageForAi";
import { geminiListingToAnalysis } from "@/lib/geminiListingMapper";
import { parseGeminiListingJson, type GeminiListingResult } from "@/lib/geminiListingSchema";
import type { AiAnalysisStep, AiListingAnalysis } from "@/types/aiListing";

export type AiListingAnalyzeResult = {
  analysis: AiListingAnalysis;
  listing: GeminiListingResult;
};
import { AI_ANALYSIS_STEPS } from "@/types/aiListing";

const ENDPOINT = "/api/ai/generate-listing";
const STEP_MS = 520;
const MIN_ANALYSIS_MS = 2800;

export function useAiListingCreator() {
  const [stepIndex, setStepIndex] = useState(0);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AiListingAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const currentStep: AiAnalysisStep | null = analyzing
    ? AI_ANALYSIS_STEPS[Math.min(stepIndex, AI_ANALYSIS_STEPS.length - 1)]
    : null;

  const reset = useCallback(() => {
    abortRef.current?.abort();
    setStepIndex(0);
    setAnalyzing(false);
    setAnalysis(null);
    setError(null);
  }, []);

  const analyzeImages = useCallback(async (files: File[], userText?: string): Promise<AiListingAnalyzeResult | null> => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    setAnalyzing(true);
    setStepIndex(0);
    setAnalysis(null);
    setError(null);

    const stepTimer = setInterval(() => {
      setStepIndex((i) => Math.min(i + 1, AI_ANALYSIS_STEPS.length - 1));
    }, STEP_MS);

    const started = Date.now();

    try {
      const fetchPromise = (async (): Promise<AiListingAnalyzeResult> => {
        const images = await filesToBase64Images(files);
        const mimeTypes = files.map((f) => f.type || "image/jpeg");

        const resp = await fetch(ENDPOINT, {
          method: "POST",
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ images, mimeTypes, userText }),
        });

        if (resp.status === 429) throw new Error("rate_limit");
        if (resp.status === 503) throw new Error("not_configured");
        if (!resp.ok) throw new Error("api_error");

        const data = await resp.json();
        const listing = parseGeminiListingJson(data.listing ?? data);
        return { analysis: geminiListingToAnalysis(listing), listing };
      })();

      const [result] = await Promise.all([
        fetchPromise,
        new Promise<void>((r) => setTimeout(r, MIN_ANALYSIS_MS)),
      ]);

      const elapsed = Date.now() - started;
      if (elapsed < MIN_ANALYSIS_MS) {
        await new Promise((r) => setTimeout(r, MIN_ANALYSIS_MS - elapsed));
      }

      setStepIndex(AI_ANALYSIS_STEPS.length - 1);
      setAnalysis(result.analysis);
      return result;
    } catch (e) {
      if ((e as Error).name === "AbortError") return null;
      const msg = (e as Error).message;
      setError(
        msg === "rate_limit"
          ? "rate_limit"
          : msg === "not_configured"
            ? "not_configured"
            : "failed",
      );
      return null;
    } finally {
      clearInterval(stepTimer);
      setAnalyzing(false);
    }
  }, []);

  return {
    analyzing,
    currentStep,
    stepIndex,
    totalSteps: AI_ANALYSIS_STEPS.length,
    analysis,
    error,
    analyzeImages,
    reset,
  };
}
