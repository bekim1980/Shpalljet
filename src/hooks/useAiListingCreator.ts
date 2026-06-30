import { useState, useCallback, useRef } from "react";
import { buildCategoryCatalog } from "@/lib/aiCategoryCatalog";
import { filesToBase64Images } from "@/lib/compressImageForAi";
import type { AiAnalysisStep, AiListingAnalysis } from "@/types/aiListing";
import { AI_ANALYSIS_STEPS } from "@/types/aiListing";

const URL_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

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

  const analyzeImages = useCallback(async (files: File[], locale = "en") => {
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
      const fetchPromise = (async (): Promise<AiListingAnalysis> => {
        const base64Images = await filesToBase64Images(files);
        const resp = await fetch(URL_BASE, {
          method: "POST",
          signal: controller.signal,
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
          },
          body: JSON.stringify({
            mode: "analyze_listing_images",
            images: base64Images,
            category_catalog: buildCategoryCatalog(),
            locale,
          }),
        });

        if (resp.status === 429) throw new Error("rate_limit");
        if (resp.status === 402) throw new Error("credits");
        if (!resp.ok) throw new Error("api_error");

        const data = await resp.json();
        if (!data.analysis) throw new Error("no_analysis");
        return data.analysis as AiListingAnalysis;
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
      setAnalysis(result);
      return result;
    } catch (e) {
      if ((e as Error).name === "AbortError") return null;
      const msg = (e as Error).message;
      setError(msg === "rate_limit" ? "rate_limit" : msg === "credits" ? "credits" : "failed");
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
