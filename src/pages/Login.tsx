import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import AuthShellContent from "@/components/auth/AuthShellContent";
import AuthPageBackdrop from "@/components/auth/ui/AuthPageBackdrop";
import AuthTrustRow from "@/components/auth/ui/AuthTrustRow";
import { RETURNING_KEY } from "@/components/auth/constants";
import { resolveAuthReturnTo } from "@/lib/authReturnPath";
import type { AuthView } from "@/components/auth/types";

const Login = () => {
  const location = useLocation();
  const { t } = useTranslation();
  const returnTo = resolveAuthReturnTo(location);

  const initialView = useMemo<AuthView>(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("view") === "register") return "register";
    return "login";
  }, [location.search]);

  const isReturning = useMemo(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(RETURNING_KEY) === "1";
    } catch {
      return false;
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const authError = params.get("authError") ?? params.get("error");
    if (authError) {
      console.warn("[oauth] login authError", { authError });
      toast.error(authError.replace(/_/g, " "));
    }
  }, [location.search]);

  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center p-4 pb-8 overflow-hidden">
      <AuthPageBackdrop />

      <div className="relative z-10 w-full max-w-[520px] motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-3 motion-safe:duration-400">
        <Link to="/" className="block text-center mb-8">
          <span className="font-display text-3xl sm:text-4xl font-bold text-gradient-gold tracking-wide">
            {t("common.appName")}
          </span>
        </Link>

        <AuthShellContent
          variant="page"
          returnTo={returnTo}
          initialView={isReturning ? "login" : initialView}
          idPrefix="auth-page"
          autoFocus
        />
      </div>

      <div className="relative z-10 mt-8 w-full max-w-3xl hidden sm:block">
        <AuthTrustRow />
      </div>
    </div>
  );
};

export default Login;
