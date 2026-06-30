import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { AiAnalysisStep } from "@/types/aiListing";
import { AI_ANALYSIS_STEPS } from "@/types/aiListing";

interface Props {
  currentStep: AiAnalysisStep | null;
  stepIndex: number;
  previews: string[];
}

const AiListingProgress = ({ currentStep, stepIndex, previews }: Props) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 py-4">
      {previews.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-1 px-1">
          {previews.slice(0, 4).map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              className="relative h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-primary/20"
            >
              <img src={src} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary/30 to-transparent animate-pulse" />
            </motion.div>
          ))}
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15">
          <Sparkles className="h-5 w-5 text-primary animate-pulse" />
        </div>
        <div>
          <p className="font-display text-sm font-semibold">{t("aiListing.analyzingTitle")}</p>
          <p className="text-xs text-muted-foreground">{t("aiListing.analyzingSubtitle")}</p>
        </div>
      </div>

      <ul className="space-y-2">
        {AI_ANALYSIS_STEPS.map((step, i) => {
          const done = i < stepIndex;
          const active = currentStep === step;
          return (
            <motion.li
              key={step}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
                active ? "bg-primary/10 text-foreground" : done ? "text-muted-foreground" : "text-muted-foreground/50"
              }`}
            >
              <span
                className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                  done
                    ? "bg-primary text-primary-foreground"
                    : active
                      ? "border-2 border-primary text-primary"
                      : "border border-border"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span className={active ? "font-medium" : ""}>{t(`aiListing.steps.${step}`)}</span>
              {active && (
                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary animate-ping" />
              )}
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
};

export default AiListingProgress;
