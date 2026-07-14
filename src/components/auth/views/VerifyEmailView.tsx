import { MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { authCtaClass } from "@/components/auth/authStyles";

type VerifyEmailViewProps = {
  email?: string;
  onBackToLogin: () => void;
};

const VerifyEmailView = ({ email, onBackToLogin }: VerifyEmailViewProps) => {
  const { t } = useTranslation();

  return (
    <div className="space-y-6 text-center py-2">
      <div className="mx-auto w-14 h-14 rounded-full bg-gold/10 border border-gold/25 flex items-center justify-center">
        <MailCheck className="h-7 w-7 text-gold/90" />
      </div>
      <div className="space-y-2">
        <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white">
          {t("auth.verifyEmailTitle")}
        </h2>
        <p className="text-sm text-white/55 leading-relaxed">
          {email ? t("auth.verifyEmailBody", { email }) : t("auth.verifyEmailBodyGeneric")}
        </p>
      </div>
      <Button type="button" onClick={onBackToLogin} className={authCtaClass}>
        {t("auth.backToLogin")}
      </Button>
    </div>
  );
};

export default VerifyEmailView;
