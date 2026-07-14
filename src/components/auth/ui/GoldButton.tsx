import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authGoldButtonClass } from "@/components/auth/authStyles";
import { cn } from "@/lib/utils";

type GoldButtonProps = {
  children: React.ReactNode;
  loading?: boolean;
  showArrow?: boolean;
  className?: string;
  type?: "button" | "submit";
  disabled?: boolean;
  onClick?: () => void;
};

const GoldButton = ({
  children,
  loading = false,
  showArrow = true,
  className,
  type = "button",
  disabled,
  onClick,
}: GoldButtonProps) => (
  <Button
    type={type}
    disabled={disabled || loading}
    onClick={onClick}
    aria-busy={loading || undefined}
    className={cn(authGoldButtonClass, "gap-2", className)}
  >
    {loading ? (
      <Loader2 className="h-5 w-5 animate-spin motion-reduce:animate-none" aria-hidden />
    ) : (
      <>
        {children}
        {showArrow && <ArrowRight className="h-4 w-4 shrink-0" aria-hidden />}
      </>
    )}
  </Button>
);

export default GoldButton;
