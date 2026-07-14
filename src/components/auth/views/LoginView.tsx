import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Loader2, Lock, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialProviders from "@/components/auth/views/SocialProviders";
import { authCtaClass, authInputClass } from "@/components/auth/authStyles";
import { RETURNING_KEY } from "@/components/auth/constants";
import { hasVisibleSocialProviders } from "@/config/authProviders";

type LoginViewProps = {
  idPrefix: string;
  formLoading: boolean;
  socialLoading: string | null;
  onSignIn: (email: string, password: string) => void;
  onGoogleSignIn: () => void;
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

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1.5">
        <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white">
          {headline}
        </h2>
        <p className="text-sm text-white/55">{t("login.valueProp")}</p>
      </div>

      <SocialProviders
        socialLoading={socialLoading}
        formLoading={formLoading}
        onGoogleSignIn={onGoogleSignIn}
      />

      {hasVisibleSocialProviders() && (
        <div className="relative py-0.5">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-white/10" />
          </div>
          <div className="relative flex justify-center">
            <span className="bg-black/85 px-3 text-[11px] text-white/45 lowercase tracking-wide">
              {t("login.orContinueEmail")}
            </span>
          </div>
        </div>
      )}

      <form
        className="space-y-3.5"
        onSubmit={(e) => {
          e.preventDefault();
          onSignIn(email, password);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-email`} className="text-xs text-white/70">
            {t("login.email")}
          </Label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-gold/80 transition-colors" />
            <Input
              ref={emailRef}
              id={`${idPrefix}-email`}
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

        <div className="space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`${idPrefix}-password`} className="text-xs text-white/70">
              {t("login.password")}
            </Label>
            <button
              type="button"
              onClick={onForgotPassword}
              className="text-xs text-gold/80 hover:text-gold transition-colors"
            >
              {t("auth.forgotPassword")}
            </button>
          </div>
          <div className="relative group">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-gold/80 transition-colors" />
            <Input
              id={`${idPrefix}-password`}
              type="password"
              placeholder="••••••••"
              className={authInputClass}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="current-password"
            />
          </div>
        </div>

        <Button type="submit" disabled={formLoading || !!socialLoading} className={authCtaClass}>
          {formLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {t("login.ctaContinue")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-white/55">
        {t("login.noAccount")}{" "}
        <button
          type="button"
          onClick={onRegister}
          className="text-gold/90 hover:text-gold font-medium transition-colors"
        >
          {t("common.signUp")}
        </button>
      </p>
    </div>
  );
};

export default LoginView;
