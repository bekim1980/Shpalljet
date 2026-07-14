import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Loader2, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authCtaClass, authInputClass } from "@/components/auth/authStyles";

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
    <div className="space-y-5">
      <div className="text-center space-y-1.5">
        <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white">
          {t("auth.forgotPasswordTitle")}
        </h2>
        <p className="text-sm text-white/55">{t("auth.forgotPasswordHint")}</p>
      </div>

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(email);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-forgot-email`} className="text-xs text-white/70">
            {t("login.email")}
          </Label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-gold/80 transition-colors" />
            <Input
              ref={emailRef}
              id={`${idPrefix}-forgot-email`}
              type="email"
              placeholder={t("login.emailPlaceholder")}
              className={authInputClass}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </div>

        <Button type="submit" disabled={formLoading} className={authCtaClass}>
          {formLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {t("auth.sendResetLink")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <button
        type="button"
        onClick={onBack}
        className="flex items-center justify-center gap-1.5 w-full text-sm text-white/55 hover:text-gold transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        {t("auth.backToLogin")}
      </button>
    </div>
  );
};

export default ForgotPasswordView;
