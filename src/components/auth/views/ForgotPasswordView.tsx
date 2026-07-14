import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import AuthInput from "@/components/auth/ui/AuthInput";
import GoldButton from "@/components/auth/ui/GoldButton";
import { authLinkClass, authViewTransitionClass } from "@/components/auth/authStyles";
import { cn } from "@/lib/utils";

type ForgotPasswordViewProps = {
  idPrefix: string;
  formLoading: boolean;
  initialEmail?: string;
  onSubmit: (email: string) => void;
  onBack: () => void;
  autoFocus?: boolean;
};

const ForgotPasswordView = ({
  idPrefix,
  formLoading,
  initialEmail = "",
  onSubmit,
  onBack,
  autoFocus = false,
}: ForgotPasswordViewProps) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState(initialEmail);
  const emailRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) emailRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className={cn("space-y-5", authViewTransitionClass)}>
      <div className="text-center space-y-2 px-1">
        <h2 className="font-display text-2xl sm:text-[1.65rem] font-semibold tracking-tight text-white">
          {t("auth.forgotPasswordTitle")}
        </h2>
        <p className="text-sm text-white/55 leading-relaxed">{t("auth.forgotPasswordHint")}</p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email);
        }}
      >
        <AuthInput
          ref={emailRef}
          id={`${idPrefix}-forgot-email`}
          label={t("login.email")}
          type="email"
          placeholder={t("login.emailPlaceholder")}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
          icon={<Mail className="h-[18px] w-[18px]" aria-hidden />}
        />

        <GoldButton type="submit" loading={formLoading}>
          {t("auth.sendResetLink")}
        </GoldButton>
      </form>

      <button type="button" onClick={onBack} className={cn("w-full text-center text-sm", authLinkClass)}>
        {t("auth.backToLogin")}
      </button>
    </div>
  );
};

export default ForgotPasswordView;
