import { useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Lock, Mail, User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SocialProviders from "@/components/auth/views/SocialProviders";
import { authCtaClass, authInputClass } from "@/components/auth/authStyles";
import { hasVisibleSocialProviders } from "@/config/authProviders";

type RegisterViewProps = {
  idPrefix: string;
  formLoading: boolean;
  socialLoading: string | null;
  onSignUp: (email: string, password: string, displayName: string) => void;
  onGoogleSignIn: () => void;
  onLogin: () => void;
  autoFocus?: boolean;
};

const RegisterView = ({
  idPrefix,
  formLoading,
  socialLoading,
  onSignUp,
  onGoogleSignIn,
  onLogin,
  autoFocus = false,
}: RegisterViewProps) => {
  const { t } = useTranslation();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus) nameRef.current?.focus();
  }, [autoFocus]);

  return (
    <div className="space-y-5">
      <div className="text-center space-y-1.5">
        <h2 className="font-display text-xl sm:text-2xl font-semibold tracking-tight text-white">
          {t("login.createAccount")}
        </h2>
        <p className="text-sm text-white/55">{t("login.joinMarket")}</p>
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
          onSignUp(email, password, displayName);
        }}
      >
        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-name`} className="text-xs text-white/70">
            {t("login.fullName")}
          </Label>
          <div className="relative group">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-gold/80 transition-colors" />
            <Input
              ref={nameRef}
              id={`${idPrefix}-name`}
              placeholder={t("login.namePlaceholder")}
              className={authInputClass}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor={`${idPrefix}-email`} className="text-xs text-white/70">
            {t("login.email")}
          </Label>
          <div className="relative group">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/40 group-focus-within:text-gold/80 transition-colors" />
            <Input
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
          <Label htmlFor={`${idPrefix}-password`} className="text-xs text-white/70">
            {t("login.password")}
          </Label>
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
              autoComplete="new-password"
            />
          </div>
        </div>

        <Button type="submit" disabled={formLoading || !!socialLoading} className={authCtaClass}>
          {formLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              {t("login.signUpButton")}
              <ArrowRight className="ml-1 h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="text-center text-sm text-white/55">
        {t("login.haveAccount")}{" "}
        <button
          type="button"
          onClick={onLogin}
          className="text-gold/90 hover:text-gold font-medium transition-colors"
        >
          {t("common.login")}
        </button>
      </p>
    </div>
  );
};

export default RegisterView;
