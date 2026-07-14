import { forwardRef, type ReactNode } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authInputClass, authLabelClass } from "@/components/auth/authStyles";
import { cn } from "@/lib/utils";

type AuthInputProps = {
  id: string;
  label: string;
  icon?: ReactNode;
  className?: string;
} & React.ComponentPropsWithoutRef<typeof Input>;

const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  ({ id, label, icon, className, ...props }, ref) => (
    <div className="space-y-2">
      <Label htmlFor={id} className={authLabelClass}>
        {label}
      </Label>
      <div className="relative group">
        {icon && (
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40 transition-colors group-focus-within:text-gold/80">
            {icon}
          </span>
        )}
        <Input ref={ref} id={id} className={cn(authInputClass, className)} {...props} />
      </div>
    </div>
  ),
);

AuthInput.displayName = "AuthInput";

export default AuthInput;
