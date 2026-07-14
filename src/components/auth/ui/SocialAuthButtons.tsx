import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  hasVisibleSocialProviders,
  isFacebookButtonVisible,
  isOAuthProviderEnabled,
} from "@/config/authProviders";
import { cn } from "@/lib/utils";

type SocialAuthButtonsProps = {
  socialLoading: string | null;
  formLoading: boolean;
  onGoogleSignIn: () => void;
  onAppleSignIn?: () => void;
  onFacebookSignIn?: () => void;
  className?: string;
};

const GoogleIcon = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden>
    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
  </svg>
);

const FacebookIcon = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
  </svg>
);

const AppleIcon = () => (
  <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
    <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
  </svg>
);

const socialBase =
  "w-full h-[52px] gap-3 rounded-xl font-medium text-[15px] border transition-[background-color,border-color,box-shadow] duration-200 focus-visible:ring-2 focus-visible:ring-gold/35";

const SocialAuthButtons = ({
  socialLoading,
  formLoading,
  onGoogleSignIn,
  onAppleSignIn,
  onFacebookSignIn,
  className,
}: SocialAuthButtonsProps) => {
  const { t } = useTranslation();
  const disabled = formLoading || !!socialLoading;

  const handleGoogleClick = () => {
    console.info("[oauth] google button clicked");
    onGoogleSignIn();
  };

  if (!hasVisibleSocialProviders() && !isOAuthProviderEnabled("apple")) return null;

  return (
    <div className={cn("space-y-2.5", className)}>
      {isOAuthProviderEnabled("google") && (
        <Button
          type="button"
          variant="outline"
          className={cn(
            socialBase,
            "border-white/15 bg-white text-[#1f1f1f] hover:bg-white/95 hover:border-white/30 shadow-sm",
          )}
          onClick={handleGoogleClick}
          disabled={disabled}
          aria-busy={socialLoading === "google" || undefined}
        >
          {socialLoading === "google" ? (
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <GoogleIcon />
          )}
          {t("login.continueGoogle")}
        </Button>
      )}

      {isFacebookButtonVisible() && onFacebookSignIn && (
        <Button
          type="button"
          variant="outline"
          className={cn(
            socialBase,
            "border-[#166FE5]/80 bg-[#1877F2] text-white hover:bg-[#166FE5] hover:border-[#166FE5]",
          )}
          onClick={onFacebookSignIn}
          disabled={disabled}
          aria-busy={socialLoading === "facebook" || undefined}
        >
          {socialLoading === "facebook" ? (
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <FacebookIcon />
          )}
          {t("auth.continueFacebook")}
        </Button>
      )}

      {isOAuthProviderEnabled("apple") && onAppleSignIn && (
        <Button
          type="button"
          variant="outline"
          className={cn(
            socialBase,
            "border-white/15 bg-black text-white hover:bg-black/90 hover:border-white/25",
          )}
          onClick={onAppleSignIn}
          disabled={disabled}
          aria-busy={socialLoading === "apple" || undefined}
        >
          {socialLoading === "apple" ? (
            <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : (
            <AppleIcon />
          )}
          {t("login.continueApple")}
        </Button>
      )}
    </div>
  );
};

export default SocialAuthButtons;
