import { MailCheck } from "lucide-react";
import { useTranslation } from "react-i18next";
import AuthHeaderBadge from "@/components/auth/ui/AuthHeaderBadge";
import GoldButton from "@/components/auth/ui/GoldButton";
import { authViewTransitionClass } from "@/components/auth/authStyles";
import { cn } from "@/lib/utils";

type VerifyEmailViewProps = {
  email?: string;
  onBackToLogin: () => void;
};

const VerifyEmailView = ({ email, onBackToLogin }: VerifyEmailViewProps) => {
  const { t } = useTranslation();

  return (
    <div className={cn("space-y-6 text-center py-2 -mt-6", authViewTransitionClass)}>
      <AuthHeaderBadge icon={MailCheck} />
      <div className="space-y-2 px-2">
        <h2 className="font-display text-2xl font-semibold tracking-tight text-white">
          {t("auth.verifyEmailTitle")}
        </h2>
        <p className="text-sm text-white/55 leading-relaxed">
          {email ? t("auth.verifyEmailBody", { email }) : t("auth.verifyEmailBodyGeneric")}
        </p>
      </div>
      <GoldButton type="button" onClick={onBackToLogin} showArrow={false}>
        {t("auth.backToLogin")}
      </GoldButton>
    </div>
  );
};

export default VerifyEmailView;
