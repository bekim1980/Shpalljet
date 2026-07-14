import { CheckCircle2 } from "lucide-react";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { authCtaClass } from "@/components/auth/authStyles";

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
    <div className="space-y-6 text-center py-4">
      <div className="mx-auto w-14 h-14 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center">
        <CheckCircle2 className="h-7 w-7 text-gold/90" />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white">
          {t("auth.successTitle")}
        </h2>
        <p className="text-sm text-white/55">{t("auth.successBody")}</p>
      </div>
      <Button type="button" onClick={onContinue} className={authCtaClass}>
        {t("auth.continueBrowsing")}
      </Button>
    </div>
  );
};

export default SuccessView;
