import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/useAuth";
import { oauthAuth } from "@/integrations/oauthAuth";
import { setAuthReturnTo } from "@/pages/AuthCallback";
import { getSiteUrl } from "@/lib/siteUrl";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { RETURNING_KEY } from "@/components/auth/constants";
import type { AuthShellVariant, AuthView } from "@/components/auth/types";

type UseAuthFormActionsOptions = {
  returnTo: string;
  variant: AuthShellVariant;
  onClose?: () => void;
  onViewChange?: (view: AuthView) => void;
};

export function useAuthFormActions({
  returnTo,
  variant,
  onClose,
  onViewChange,
}: UseAuthFormActionsOptions) {
  const { signIn, signUp } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [formLoading, setFormLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState<string | null>(null);

  const markReturning = useCallback(() => {
    try {
      localStorage.setItem(RETURNING_KEY, "1");
    } catch {
      /* noop */
    }
  }, []);

  const finishSuccess = useCallback(() => {
    if (variant === "modal") {
      onClose?.();
      return;
    }
    navigate(returnTo, { replace: true });
  }, [variant, onClose, navigate, returnTo]);

  const handleGoogleSignIn = useCallback(async () => {
    setSocialLoading("google");
    try {
      setAuthReturnTo(returnTo);
      const result = await oauthAuth.signInWithOAuth("google");
      if (result.redirected) {
        markReturning();
        return;
      }
      if (result.error) {
        toast.error(result.error.message);
      } else {
        markReturning();
        if (variant === "modal") {
          onViewChange?.("success");
        } else {
          finishSuccess();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      toast.error(message);
    } finally {
      setSocialLoading(null);
    }
  }, [returnTo, markReturning, onViewChange, finishSuccess, variant]);

  const handleAppleSignIn = useCallback(async () => {
    setSocialLoading("apple");
    try {
      setAuthReturnTo(returnTo);
      const result = await oauthAuth.signInWithOAuth("apple");
      if (result.redirected) {
        markReturning();
        return;
      }
      if (result.error) {
        toast.error(result.error.message);
      } else {
        markReturning();
        if (variant === "modal") {
          onViewChange?.("success");
        } else {
          finishSuccess();
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Error";
      toast.error(message);
    } finally {
      setSocialLoading(null);
    }
  }, [returnTo, markReturning, onViewChange, finishSuccess, variant]);

  const handleSignIn = useCallback(
    async (email: string, password: string) => {
      setFormLoading(true);
      const { error } = await signIn(email, password);
      if (error) {
        toast.error(error.message);
      } else {
        markReturning();
        if (variant === "modal") {
          onViewChange?.("success");
        } else {
          finishSuccess();
        }
      }
      setFormLoading(false);
    },
    [signIn, markReturning, onViewChange, finishSuccess, variant],
  );

  const handleSignUp = useCallback(
    async (email: string, password: string, displayName: string) => {
      setFormLoading(true);
      const { data, error } = await signUp(email, password, displayName);
      if (error) {
        toast.error(error.message);
      } else if (data?.session) {
        markReturning();
        toast.success(t("login.welcomeNew"));
        if (variant === "modal") {
          onViewChange?.("success");
        } else {
          finishSuccess();
        }
      } else {
        markReturning();
        onViewChange?.("verify-email");
      }
      setFormLoading(false);
    },
    [signUp, markReturning, onViewChange, finishSuccess, variant, t],
  );

  const handleForgotPassword = useCallback(
    async (email: string) => {
      setFormLoading(true);
      const redirectTo = `${getSiteUrl()}/login`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) {
        toast.error(error.message);
      } else {
        toast.success(t("auth.resetEmailSent"));
        onViewChange?.("verify-email");
      }
      setFormLoading(false);
    },
    [onViewChange, t],
  );

  return {
    formLoading,
    socialLoading,
    handleGoogleSignIn,
    handleAppleSignIn,
    handleSignIn,
    handleSignUp,
    handleForgotPassword,
  };
}
