import { useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import AuthShellContent from "@/components/auth/AuthShellContent";
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
    const authError = params.get("authError");
    if (authError) {
      toast.error(authError.replace(/_/g, " "));
    }
  }, [location.search]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="w-full max-w-md"
      >
        <Link to="/" className="block text-center mb-6">
          <span className="font-display text-3xl font-bold text-gradient-gold">{t("common.appName")}</span>
        </Link>

        <AuthShellContent
          variant="page"
          returnTo={returnTo}
          initialView={isReturning ? "login" : initialView}
          idPrefix="auth-page"
          autoFocus
        />
      </motion.div>
    </div>
  );
};

export default Login;
