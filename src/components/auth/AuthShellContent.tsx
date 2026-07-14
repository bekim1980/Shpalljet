import { useEffect, useState } from "react";
import AuthViewRouter from "@/components/auth/AuthViewRouter";
import AuthModal from "@/components/auth/ui/AuthModal";
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

  const compactPanel = view === "forgot-password";

  return (
    <AuthModal
      view={view}
      onClose={onClose}
      showClose={variant === "modal" && !!onClose}
      compact={compactPanel}
    >
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
    </AuthModal>
  );
};

export default AuthShellContent;
