import { useEffect, useRef, useState } from "react";
import { Mail, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import AuthDivider from "@/components/auth/ui/AuthDivider";
import AuthInput from "@/components/auth/ui/AuthInput";
import AuthStepIndicator, { type RegisterStep } from "@/components/auth/ui/AuthStepIndicator";
import GoldButton from "@/components/auth/ui/GoldButton";
import PasswordInput from "@/components/auth/ui/PasswordInput";
import SocialAuthButtons from "@/components/auth/ui/SocialAuthButtons";
import { authLinkClass, authViewTransitionClass } from "@/components/auth/authStyles";
import { hasVisibleSocialProviders, isOAuthProviderEnabled } from "@/config/authProviders";
import { cn } from "@/lib/utils";

type RegisterViewProps = {
  idPrefix: string;
  formLoading: boolean;
  socialLoading: string | null;
  onSignUp: (email: string, password: string, displayName: string) => void;
  onGoogleSignIn: () => void;
  onAppleSignIn?: () => void;
  onLogin: () => void;
  autoFocus?: boolean;
};

const RegisterView = ({
  idPrefix,
  formLoading,
  socialLoading,
  onSignUp,
  onGoogleSignIn,
  onAppleSignIn,
  onLogin,
  autoFocus = false,
}: RegisterViewProps) => {
  const { t } = useTranslation();
  const [step, setStep] = useState<RegisterStep>(1);
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus, step]);

  const stepLabels = [t("auth.registerStepAccount"), t("auth.registerStepDetails"), t("auth.registerStepDone")] as [
    string,
    string,
    string,
  ];

  const showSocial =
    hasVisibleSocialProviders() || isOAuthProviderEnabled("apple");

  const advanceFromStep1 = () => {
    if (!acceptedTerms) {
      toast.error(t("auth.acceptTermsRequired"));
      return;
    }
    if (password.length < 6) {
      toast.error(t("auth.passwordMinLength"));
      return;
    }
    setStep(2);
  };

  const submitRegistration = () => {
    if (!acceptedTerms) {
      toast.error(t("auth.acceptTermsRequired"));
      return;
    }
    onSignUp(email, password, displayName);
  };

  return (
    <div className={cn("space-y-5", authViewTransitionClass)}>
      <AuthStepIndicator currentStep={step} labels={stepLabels} />

      <div className="text-center space-y-2 px-1">
        <h2 className="font-display text-2xl sm:text-[1.65rem] font-semibold tracking-tight text-white">
          {t("login.createAccount")}
        </h2>
        <p className="text-sm text-white/55 leading-relaxed whitespace-pre-line">{t("login.joinMarket")}</p>
      </div>

      {step === 1 && (
        <>
          {showSocial && (
            <>
              <SocialAuthButtons
                socialLoading={socialLoading}
                formLoading={formLoading}
                onGoogleSignIn={onGoogleSignIn}
                onAppleSignIn={onAppleSignIn}
              />
              <AuthDivider />
            </>
          )}

          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              advanceFromStep1();
            }}
          >
            <AuthInput
              ref={nameRef}
              id={`${idPrefix}-name`}
              label={t("login.fullName")}
              placeholder={t("login.namePlaceholder")}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
              icon={<User className="h-[18px] w-[18px]" aria-hidden />}
            />

            <AuthInput
              id={`${idPrefix}-email`}
              label={t("login.email")}
              type="email"
              placeholder={t("login.emailPlaceholder")}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              icon={<Mail className="h-[18px] w-[18px]" aria-hidden />}
            />

            <PasswordInput
              id={`${idPrefix}-password`}
              label={t("login.password")}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
            />

            <div className="flex items-start gap-2.5 pt-1">
              <input
                id={`${idPrefix}-terms`}
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 h-4 w-4 shrink-0 rounded border-white/20 bg-white/5 text-gold focus:ring-gold/40 focus:ring-offset-0"
                required
              />
              <label htmlFor={`${idPrefix}-terms`} className="text-xs text-white/55 leading-relaxed cursor-pointer">
                {t("auth.acceptTermsPrefix")}{" "}
                <a
                  href={t("auth.termsHref")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={authLinkClass}
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("auth.termsLink")}
                </a>{" "}
                {t("auth.acceptTermsAnd")}{" "}
                <a
                  href={t("auth.privacyHref")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={authLinkClass}
                  onClick={(e) => e.stopPropagation()}
                >
                  {t("auth.privacyLink")}
                </a>
              </label>
            </div>

            <GoldButton type="submit" disabled={!!socialLoading}>
              {t("login.continueButton")}
            </GoldButton>
          </form>
        </>
      )}

      {step === 2 && (
        <div className="space-y-4">
          <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-3 text-sm">
            <div className="flex justify-between gap-3 border-b border-white/8 pb-3">
              <span className="text-white/45">{t("login.fullName")}</span>
              <span className="text-white font-medium text-right">{displayName}</span>
            </div>
            <div className="flex justify-between gap-3">
              <span className="text-white/45">{t("login.email")}</span>
              <span className="text-white font-medium text-right break-all">{email}</span>
            </div>
          </div>

          <p className="text-xs text-white/45 text-center leading-relaxed">{t("auth.registerReviewHint")}</p>

          <GoldButton
            type="button"
            loading={formLoading}
            disabled={!!socialLoading}
            onClick={submitRegistration}
          >
            {t("login.signUpButton")}
          </GoldButton>

          <button
            type="button"
            onClick={() => setStep(1)}
            className={cn("w-full text-center text-sm text-white/50 hover:text-gold transition-colors", authLinkClass)}
          >
            {t("auth.backToPreviousStep")}
          </button>
        </div>
      )}

      <p className="text-center text-sm text-white/55">
        {t("login.haveAccountShort")}{" "}
        <button type="button" onClick={onLogin} className={authLinkClass}>
          {t("login.loginHere")}
        </button>
      </p>
    </div>
  );
};

export default RegisterView;
