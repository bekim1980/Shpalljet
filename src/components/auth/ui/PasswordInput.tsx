import { forwardRef, useState } from "react";
import { Eye, EyeOff, Lock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authInputClass, authLabelClass } from "@/components/auth/authStyles";
import { cn } from "@/lib/utils";

type PasswordInputProps = {
  id: string;
  label: string;
  labelAction?: React.ReactNode;
  className?: string;
} & Omit<React.ComponentPropsWithoutRef<typeof Input>, "type">;

const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ id, label, labelAction, className, ...props }, ref) => {
    const { t } = useTranslation();
    const [visible, setVisible] = useState(false);

    return (
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <Label htmlFor={id} className={authLabelClass}>
            {label}
          </Label>
          {labelAction}
        </div>
        <div className="relative group">
          <Lock
            className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-white/40 transition-colors group-focus-within:text-gold/80"
            aria-hidden
          />
          <Input
            ref={ref}
            id={id}
            type={visible ? "text" : "password"}
            className={cn(authInputClass, "pr-12", className)}
            {...props}
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-white/45 hover:text-gold/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold/40"
            aria-label={visible ? t("auth.hidePassword") : t("auth.showPassword")}
          >
            {visible ? <EyeOff className="h-[18px] w-[18px]" /> : <Eye className="h-[18px] w-[18px]" />}
          </button>
        </div>
      </div>
    );
  },
);

PasswordInput.displayName = "PasswordInput";

export default PasswordInput;
