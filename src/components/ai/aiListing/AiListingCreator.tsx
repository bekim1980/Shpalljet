import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, ArrowLeft, Camera, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import ImageUploader from "@/components/ImageUploader";
import { useAiListingCreator } from "@/hooks/useAiListingCreator";
import AiListingProgress from "./AiListingProgress";
import AiListingReview from "./AiListingReview";
import type { DraftData } from "@/hooks/useDraftListing";
import type { AiListingAnalysis } from "@/types/aiListing";
import { applyGeminiListingToDraft } from "@/lib/geminiListingMapper";

export type AiListingPhase = "upload" | "analyzing" | "review";

interface Props {
  draft: DraftData;
  onDraftChange: (updates: Partial<DraftData>) => void;
  categoryIdForSlug: (slug: string) => string;
  images: File[];
  previews: string[];
  onImagesChange: (images: File[], previews: string[]) => void;
  errors: Record<string, string>;
  submitting: boolean;
  onPublish: (analysis: AiListingAnalysis | null, missingAnswers: Record<string, string>) => void;
  onExit: () => void;
  defaultCurrency: string;
  locale: string;
}

const AiListingCreator = ({
  draft,
  onDraftChange,
  categoryIdForSlug,
  images,
  previews,
  onImagesChange,
  errors,
  submitting,
  onPublish,
  onExit,
  defaultCurrency,
  locale,
}: Props) => {
  const { t } = useTranslation();
  const { analyzing, currentStep, stepIndex, totalSteps, analysis, error, analyzeImages, reset } =
    useAiListingCreator();

  const [phase, setPhase] = useState<AiListingPhase>("upload");
  const [userNotes, setUserNotes] = useState("");
  const [localAnalysis, setLocalAnalysis] = useState<AiListingAnalysis | null>(null);
  const [missingAnswers, setMissingAnswers] = useState<Record<string, string>>({});
  const [disambiguationChoice, setDisambiguationChoice] = useState<Record<string, string>>({});

  const handleStartAnalysis = useCallback(async () => {
    if (images.length === 0) return;
    setPhase("analyzing");
    const result = await analyzeImages(images, userNotes.trim() || undefined);
    if (result) {
      const slug = result.listing.category !== "Unknown" ? result.listing.category : result.analysis.category;
      const catId = categoryIdForSlug(slug);
      onDraftChange(applyGeminiListingToDraft(result.listing, catId));
      setLocalAnalysis(result.analysis);
      setPhase("review");
    } else {
      setPhase("upload");
    }
  }, [images, analyzeImages, userNotes, categoryIdForSlug, onDraftChange]);

  const handleAnalysisPatch = (patch: Partial<AiListingAnalysis>) => {
    if (!localAnalysis) return;
    setLocalAnalysis({ ...localAnalysis, ...patch });
  };

  const handleBack = () => {
    if (phase === "review") {
      setPhase("upload");
      setLocalAnalysis(null);
      reset();
    } else {
      onExit();
    }
  };

  const activeAnalysis = localAnalysis ?? analysis;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={handleBack}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="h-4 w-4 text-primary shrink-0" />
          <h2 className="font-display font-bold text-lg truncate">{t("aiListing.title")}</h2>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {phase === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-4"
          >
            <p className="text-sm text-muted-foreground">{t("aiListing.uploadHint")}</p>
            <ImageUploader
              images={images}
              previews={previews}
              maxImages={10}
              onImagesChange={onImagesChange}
            />
            <div className="space-y-2">
              <Label htmlFor="ai-creator-notes">{t("aiListing.userNotes")}</Label>
              <Textarea
                id="ai-creator-notes"
                placeholder={t("aiListing.userNotesPlaceholder")}
                className="bg-secondary/50 min-h-[72px] text-sm"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                maxLength={500}
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">
                {error === "rate_limit"
                  ? t("ai.rateLimit")
                  : error === "not_configured"
                    ? t("aiListing.notConfigured")
                    : error === "credits"
                      ? t("ai.creditsOut")
                      : t("aiListing.analysisFailed")}
              </p>
            )}
            <Button
              type="button"
              variant="gold"
              className="w-full"
              disabled={images.length === 0 || analyzing}
              onClick={handleStartAnalysis}
            >
              {analyzing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <Camera className="h-4 w-4 mr-2" />
                  {t("aiListing.analyzeCta", { count: images.length })}
                </>
              )}
            </Button>
          </motion.div>
        )}

        {phase === "analyzing" && (
          <motion.div
            key="analyzing"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <AiListingProgress
              currentStep={currentStep}
              stepIndex={stepIndex}
              previews={previews}
            />
            <p className="text-center text-[11px] text-muted-foreground mt-4">
              {t("aiListing.stepProgress", { current: stepIndex + 1, total: totalSteps })}
            </p>
          </motion.div>
        )}

        {phase === "review" && activeAnalysis && (
          <motion.div
            key="review"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0 }}
          >
            <AiListingReview
              analysis={activeAnalysis}
              draft={draft}
              previews={previews}
              onDraftChange={onDraftChange}
              onAnalysisPatch={handleAnalysisPatch}
              missingAnswers={missingAnswers}
              onMissingAnswer={(field, value) =>
                setMissingAnswers((prev) => ({ ...prev, [field]: value }))
              }
              disambiguationChoice={disambiguationChoice}
              onDisambiguationChoice={(field, value) => {
                setDisambiguationChoice((prev) => ({ ...prev, [field]: value }));
                const opt = activeAnalysis?.disambiguation
                  .find((d) => d.field === field)
                  ?.options.find((o) => o.value === value);
                if (field === "model") handleAnalysisPatch({ model: value });
                if (field === "title") onDraftChange({ title: opt?.label ?? value });
              }}
              errors={errors}
              submitting={submitting}
              onPublish={() => onPublish(activeAnalysis, missingAnswers)}
              onBack={handleBack}
              defaultCurrency={defaultCurrency}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AiListingCreator;
