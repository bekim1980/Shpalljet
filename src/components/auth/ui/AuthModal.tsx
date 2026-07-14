import { Shield, Lock, UserRound } from "lucide-react";
import AuthHeaderBadge from "@/components/auth/ui/AuthHeaderBadge";
import AuthPanel from "@/components/auth/ui/AuthPanel";
import type { AuthView } from "@/components/auth/types";

type AuthModalProps = {
  view: AuthView;
  children: React.ReactNode;
  onClose?: () => void;
  showClose?: boolean;
  compact?: boolean;
};

const badgeByView: Partial<Record<AuthView, typeof Shield>> = {
  login: Shield,
  register: UserRound,
  "forgot-password": Lock,
};

const AuthModal = ({ view, children, onClose, showClose, compact }: AuthModalProps) => {
  const BadgeIcon = badgeByView[view] ?? Shield;

  return (
    <AuthPanel compact={compact} onClose={onClose} showClose={showClose}>
      {view !== "success" && view !== "verify-email" && <AuthHeaderBadge icon={BadgeIcon} />}
      {children}
    </AuthPanel>
  );
};

export default AuthModal;
