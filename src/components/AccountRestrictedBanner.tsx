import type { AccountRestriction } from "@/lib/accountRestriction";
import { Ban } from "lucide-react";

interface AccountRestrictedBannerProps {
  restriction: AccountRestriction | null;
  className?: string;
}

const AccountRestrictedBanner = ({
  restriction,
  className = "",
}: AccountRestrictedBannerProps) => {
  if (!restriction) return null;

  return (
    <div
      role="alert"
      className={`rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive flex gap-2 ${className}`}
    >
      <Ban className="h-4 w-4 shrink-0 mt-0.5" />
      <p>{restriction.message}</p>
    </div>
  );
};

export default AccountRestrictedBanner;
