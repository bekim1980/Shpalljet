import { useEffect, useState } from "react";
import { Shield, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";
import AuthViewRouter from "@/components/auth/AuthViewRouter";
import { authCardClass } from "@/components/auth/authStyles";
import { useAuthFormActions } from "@/components/auth/useAuthFormActions";
import type { AuthShellVariant, AuthView } from "@/components/auth/types";

type AuthShellContentProps = {
  variant: AuthShellVariant;
  returnTo: string;
  initialView?: AuthView;
  idPrefix: string;
  onClose?: () => void;
  autoFocus?: boolean;
};

const AuthShellContent = ({
  variant,
  returnTo,
  initialView = "login",
  idPrefix,
  onClose,
  autoFocus = false,
}: AuthShellContentProps) => {
  const { t } = useTranslation();
  const [view, setView] = useState<AuthView>(initialView);
  const [pendingEmail, setPendingEmail] = useState("");

  useEffect(() => {
    setView(initialView);
  }, [initialView]);

  const actions = useAuthFormActions({
    returnTo,
    variant,
    onClose,
    onViewChange: setView,
  });

  return (
    <div className={`${authCardClass} p-5 sm:p-6 space-y-4`}>
      <AuthViewRouter
        view={view}
        idPrefix={idPrefix}
        pendingEmail={pendingEmail}
        autoFocus={autoFocus}
        setPendingEmail={setPendingEmail}
        setView={setView}
        onClose={onClose}
        actions={actions}
      />

      {view !== "success" && view !== "verify-email" && (
        <div className="flex items-center justify-center gap-2 pt-1 text-[11px] text-white/35">
          <Shield className="h-3 w-3" aria-hidden />
          <Zap className="h-3 w-3" aria-hidden />
          <span>{t("login.trustSignals")}</span>
        </div>
      )}
    </div>
  );
};

export default AuthShellContent;
