import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import AuthHeaderBadge from "@/components/auth/ui/AuthHeaderBadge";
import GoldButton from "@/components/auth/ui/GoldButton";
import { authViewTransitionClass } from "@/components/auth/authStyles";
import { cn } from "@/lib/utils";

type SuccessViewProps = {
  onContinue: () => void;
  autoCloseMs?: number;
};

const SuccessView = ({ onContinue, autoCloseMs = 1200 }: SuccessViewProps) => {
  const { t } = useTranslation();

  useEffect(() => {
    const timer = window.setTimeout(onContinue, autoCloseMs);
    return () => window.clearTimeout(timer);
  }, [onContinue, autoCloseMs]);

  return (
    <div className={cn("space-y-6 text-center py-2 -mt-6", authViewTransitionClass)}>
      <AuthHeaderBadge icon={CheckCircle2} />
      <div className="space-y-2 px-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
          {t("auth.successTitle")}
        </h2>
        <p className="text-sm text-white/55">{t("auth.successBody")}</p>
      </div>
      <GoldButton type="button" onClick={onContinue} showArrow={false}>
        {t("auth.continueBrowsing")}
      </GoldButton>
    </div>
  );
};

export default SuccessView;
