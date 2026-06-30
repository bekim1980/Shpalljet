import { useGenerateListing } from "@/hooks/useGenerateListing";
import { useAiListingCreator } from "@/hooks/useAiListingCreator";
import {
  applyGeminiListingToDraft,
  geminiListingToAnalysis,
} from "@/lib/geminiListingMapper";
import type { DraftData } from "@/hooks/useDraftListing";
import type { AiListingAnalysis } from "@/types/aiListing";
import type { GeminiListingResult } from "@/lib/geminiListingSchema";

export type ListingAiGenerationResult = {
  listing: GeminiListingResult;
  analysis: AiListingAnalysis;
  draftPatch: Partial<DraftData>;
};

/**
 * Unified listing generation via /api/ai/generate-listing (Gemini 3 Flash Preview).
 */
export function useListingAiGeneration(categoryIdForSlug: (slug: string) => string) {
  const gemini = useGenerateListing();
  const legacy = useAiListingCreator();

  const generateFromImages = async (
    files: File[],
    userText?: string,
  ): Promise<ListingAiGenerationResult | null> => {
    const listing = await gemini.generate(files, userText);
    if (!listing) return null;

    const slug = listing.category !== "Unknown" ? listing.category : "";
    const catId = categoryIdForSlug(slug);
    return {
      listing,
      analysis: geminiListingToAnalysis(listing),
      draftPatch: applyGeminiListingToDraft(listing, catId),
    };
  };

  return {
    loading: gemini.loading || legacy.analyzing,
    error: gemini.error,
    generateFromImages,
    legacy,
    gemini,
  };
}
