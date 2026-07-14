import { Shield, Zap, Ban } from "lucide-react";
import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type AuthTrustRowProps = {
  className?: string;
  compact?: boolean;
};

const AuthTrustRow = ({ className, compact = false }: AuthTrustRowProps) => {
  const { t } = useTranslation();

  if (compact) {
    return (
      <p className={cn("text-center text-[11px] text-white/40 tracking-wide", className)}>
        {t("login.trustSignals")}
      </p>
    );
  }

  const items = [
    { icon: Shield, label: t("auth.trustSecure") },
    { icon: Zap, label: t("auth.trustFast") },
    { icon: Ban, label: t("auth.trustNoSpam") },
  ];

  return (
    <div className={cn("flex items-center justify-center gap-4 sm:gap-6 text-[11px] text-white/45", className)}>
      {items.map(({ icon: Icon, label }, i) => (
        <span key={label} className="inline-flex items-center gap-1.5">
          <Icon className="h-3.5 w-3.5 text-gold/70" aria-hidden />
          {label}
          {i < items.length - 1 && <span className="hidden sm:inline text-white/20 ml-2 sm:ml-4" aria-hidden>·</span>}
        </span>
      ))}
    </div>
  );
};

export default AuthTrustRow;
