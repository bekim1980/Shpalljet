import { useTranslation } from "react-i18next";
import { cn } from "@/lib/utils";

type AuthDividerProps = {
  label?: string;
  className?: string;
};

const AuthDivider = ({ label, className }: AuthDividerProps) => {
  const { t } = useTranslation();
  const text = label ?? t("login.orDivider");

  return (
    <div className={cn("relative py-1", className)}>
      <div className="absolute inset-0 flex items-center" aria-hidden>
        <span className="w-full border-t border-white/10" />
      </div>
      <div className="relative flex justify-center">
        <span className="bg-transparent px-3 text-[11px] font-semibold uppercase tracking-[0.2em] text-white/45">
          {text}
        </span>
      </div>
    </div>
  );
};

export default AuthDivider;
