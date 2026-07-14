import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

export type RegisterStep = 1 | 2 | 3;

type AuthStepIndicatorProps = {
  currentStep: RegisterStep;
  className?: string;
  labels: [string, string, string];
};

const AuthStepIndicator = ({ currentStep, className, labels }: AuthStepIndicatorProps) => {
  const { t } = useTranslation();

  return (
    <div
      className={cn("flex items-center justify-center gap-2 sm:gap-3", className)}
      role="list"
      aria-label={t("auth.registerStepsLabel")}
    >
      {labels.map((label, index) => {
        const step = (index + 1) as RegisterStep;
        const active = step === currentStep;
        const done = step < currentStep;

        return (
          <div key={label} className="flex items-center gap-2 sm:gap-3" role="listitem">
            <div className="flex flex-col items-center gap-1 min-w-[72px] sm:min-w-[80px]">
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold border transition-colors duration-200",
                  active && "border-gold bg-gold/15 text-gold shadow-[0_0_16px_rgba(212,175,55,0.2)]",
                  done && "border-gold/50 bg-gold/10 text-gold/90",
                  !active && !done && "border-white/15 bg-white/[0.03] text-white/40",
                )}
                aria-current={active ? "step" : undefined}
              >
                {step}
              </span>
              <span
                className={cn(
                  "text-[10px] sm:text-[11px] font-medium text-center leading-tight",
                  active ? "text-gold" : done ? "text-white/55" : "text-white/35",
                )}
              >
                {label}
              </span>
            </div>
            {index < labels.length - 1 && (
              <div
                className={cn(
                  "mb-5 h-px w-6 sm:w-10 transition-colors duration-200",
                  done ? "bg-gold/40" : "bg-white/10",
                )}
                aria-hidden
              />
            )}
          </div>
        );
      })}
    </div>
  );
};

export default AuthStepIndicator;
