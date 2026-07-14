import { X } from "lucide-react";
import { useTranslation } from "react-i18next";
import { authPanelClass, authPanelCompactClass, authViewTransitionClass } from "@/components/auth/authStyles";
import { cn } from "@/lib/utils";

type AuthPanelProps = {
  children: React.ReactNode;
  className?: string;
  compact?: boolean;
  onClose?: () => void;
  showClose?: boolean;
};

const AuthPanel = ({ children, className, compact = false, onClose, showClose }: AuthPanelProps) => {
  const { t } = useTranslation();

  return (
    <div
      className={cn(
        compact ? authPanelCompactClass : authPanelClass,
        "pt-12 pb-6 px-5 sm:px-7 sm:pb-7",
        authViewTransitionClass,
        className,
      )}
    >
      {showClose && onClose && (
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 text-white/50 hover:text-white hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40 transition-colors"
          aria-label={t("auth.closeModal")}
        >
          <X className="h-5 w-5" />
        </button>
      )}
      {children}
    </div>
  );
};

export default AuthPanel;
