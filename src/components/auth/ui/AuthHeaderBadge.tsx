import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type AuthHeaderBadgeProps = {
  icon: LucideIcon;
  className?: string;
};

const AuthHeaderBadge = ({ icon: Icon, className }: AuthHeaderBadgeProps) => (
  <div
    className={cn(
      "mx-auto -mt-[52px] mb-3 flex h-[72px] w-[72px] items-center justify-center rounded-full",
      "border border-gold/35 bg-gradient-to-b from-[#1a1510] to-black",
      "shadow-[0_8px_32px_rgba(0,0,0,0.45),0_0_24px_rgba(212,175,55,0.12)]",
      className,
    )}
    aria-hidden
  >
    <div className="flex h-[56px] w-[56px] items-center justify-center rounded-full border border-gold/25 bg-black/80">
      <Icon className="h-7 w-7 text-gold" strokeWidth={1.75} />
    </div>
  </div>
);

export default AuthHeaderBadge;
