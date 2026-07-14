import { useEffect, useMemo, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import AuthDivider from "@/components/auth/ui/AuthDivider";
import AuthInput from "@/components/auth/ui/AuthInput";
import AuthTrustRow from "@/components/auth/ui/AuthTrustRow";
import GoldButton from "@/components/auth/ui/GoldButton";
import PasswordInput from "@/components/auth/ui/PasswordInput";
import SocialAuthButtons from "@/components/auth/ui/SocialAuthButtons";
import { authLinkClass, authViewTransitionClass } from "@/components/auth/authStyles";
import { RETURNING_KEY } from "@/components/auth/constants";
import { hasVisibleSocialProviders, isOAuthProviderEnabled } from "@/config/authProviders";
import { cn } from "@/lib/utils";

type LoginViewProps = {
  idPrefix: string;
  formLoading: boolean;
  socialLoading: string | null;
  onSignIn: (email: string, password: string) => void;
  onGoogleSignIn: () => void;
  onAppleSignIn?: () => void;
  onForgotPassword: () => void;
  onRegister: () => void;
  autoFocus?: boolean;
};

const LoginView = ({
  idPrefix,
  formLoading,
  socialLoading,
  onSignIn,
  onGoogleSignIn,
  onAppleSignIn,
  onForgotPassword,
  onRegister,
  autoFocus = false,
}: LoginViewProps) => {
  const { t } = useTranslation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);

  const isReturning = useMemo(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(RETURNING_KEY) === "1";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    if (autoFocus) emailRef.current?.focus();
  }, [autoFocus]);

  const headline = isReturning ? t("login.welcomeReturning") : t("login.welcomeNew");
  const showSocial =
    hasVisibleSocialProviders() || isOAuthProviderEnabled("apple");

  return (
    <div className={cn("space-y-5", authViewTransitionClass)}>
      <div className="text-center space-y-2 px-1">
        <h2 className="font-display text-2xl sm:text-[1.65rem] font-semibold tracking-tight text-white">
          {headline}
        </h2>
        <p className="text-sm text-white/55 leading-relaxed whitespace-pre-line">{t("login.valueProp")}</p>
      </div>

      {showSocial && (
        <SocialAuthButtons
          socialLoading={socialLoading}
          formLoading={formLoading}
          onGoogleSignIn={onGoogleSignIn}
          onAppleSignIn={onAppleSignIn}
        />
      )}

      {showSocial && <AuthDivider />}

      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          onSignIn(email, password);
        }}
      >
        <AuthInput
          ref={emailRef}
          id={`${idPrefix}-email`}
          label={t("login.email")}
          type="email"
          inputMode="email"
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
          labelAction={
            <button type="button" onClick={onForgotPassword} className={cn("text-xs", authLinkClass)}>
              {t("auth.forgotPassword")}
            </button>
          }
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={6}
          autoComplete="current-password"
        />

        <GoldButton type="submit" loading={formLoading} disabled={!!socialLoading}>
          {t("login.loginButton")}
        </GoldButton>
      </form>

      <p className="text-center text-sm text-white/55">
        {t("login.noAccount")}{" "}
        <button type="button" onClick={onRegister} className={authLinkClass}>
          {t("login.registerHere")}
        </button>
      </p>

      <AuthTrustRow compact />
    </div>
  );
};

export default LoginView;
