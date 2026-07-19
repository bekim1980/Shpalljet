// Boost checkout: redirects to Stripe; entitlement granted only via webhook.
import { useState } from "react";
import { Rocket, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { track } from "@/lib/analytics";
import { useAuth } from "@/hooks/useAuth";
import { PAYMENTS_ENABLED } from "@/config/features";
import { CATALOG_DISPLAY, type EntitlementTypeId } from "@/lib/entitlementCatalogDisplay";
import { CheckoutAuthError, CheckoutConfigError, redirectToCheckout } from "@/lib/createCheckoutSession";

type BoostOption = {
  id: "24h" | "3d" | "7d";
  entitlementType: EntitlementTypeId;
  label: string;
  priceLabel: string;
};

const OPTIONS: BoostOption[] = [
  { id: "24h", entitlementType: "boost_1", label: CATALOG_DISPLAY.boost_1.label, priceLabel: CATALOG_DISPLAY.boost_1.priceLabel },
  { id: "3d", entitlementType: "boost_3", label: CATALOG_DISPLAY.boost_3.label, priceLabel: CATALOG_DISPLAY.boost_3.priceLabel },
  { id: "7d", entitlementType: "boost_7", label: CATALOG_DISPLAY.boost_7.label, priceLabel: CATALOG_DISPLAY.boost_7.priceLabel },
];

interface BoostDialogProps {
  productId: string;
  productTitle?: string;
  trigger?: React.ReactNode;
  currentBoostExpiresAt?: string | null;
}

const BoostDialog = ({ productId, productTitle, trigger, currentBoostExpiresAt }: BoostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<BoostOption["id"]>("3d");
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const [isPending, setIsPending] = useState(false);
  const { session } = useAuth();

  if (!PAYMENTS_ENABLED) return null;

  const activeUntil = currentBoostExpiresAt && new Date(currentBoostExpiresAt) > new Date()
    ? currentBoostExpiresAt
    : null;

  const handleConfirm = async () => {
    const opt = OPTIONS.find((o) => o.id === selected)!;

    if (!session?.access_token) {
      toast.error("Please sign in to boost this listing.");
      return;
    }

    setIsPending(true);
    try {
      track("boost_confirm", {
        dedupeKey: `${productId}:${opt.id}`,
        props: { id: productId, duration: opt.id, entitlementType: opt.entitlementType },
      });

      await redirectToCheckout({
        productId,
        entitlementType: opt.entitlementType,
        accessToken: session.access_token,
      });
    } catch (err) {
      if (err instanceof CheckoutAuthError) {
        toast.error("Please sign in to continue.");
      } else if (err instanceof CheckoutConfigError) {
        toast.error("Payments are not configured yet. Contact support.");
      } else {
        toast.error(err instanceof Error ? err.message : "Could not start checkout.");
      }
      setIsPending(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setStep("choose");
        if (o) {
          track("boost_click", { dedupeKey: productId, props: { id: productId } });
        }
      }}
    >
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="gold-outline" size="sm" className="gap-1.5">
            <Rocket className="h-4 w-4" />🚀 Boost
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            Boost listing
          </DialogTitle>
          <DialogDescription>
            {productTitle ? <span className="font-medium">{productTitle}</span> : "Promote this listing"} —
            boosted listings rank higher in search and browse.
            {activeUntil && (
              <span className="block mt-1 text-xs text-primary/80">
                Already boosted until {new Date(activeUntil).toLocaleDateString()} — new time stacks on top.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        {step === "choose" && (
          <>
            <div className="grid grid-cols-3 gap-2 py-2">
              {OPTIONS.map((opt) => {
                const isSel = selected === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setSelected(opt.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      isSel
                        ? "border-primary bg-primary/10 shadow-gold"
                        : "border-border/50 bg-secondary/30 hover:border-primary/50"
                    }`}
                  >
                    <p className="text-xs text-muted-foreground">{opt.label}</p>
                    <p className="font-display text-lg font-semibold text-primary mt-1">{opt.priceLabel}</p>
                  </button>
                );
              })}
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button variant="gold" onClick={() => setStep("confirm")}>Continue</Button>
            </DialogFooter>
          </>
        )}

        {step === "confirm" && (
          <>
            <div className="rounded-lg border border-border/40 bg-secondary/20 p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Duration</span>
                <span className="font-medium">{OPTIONS.find((o) => o.id === selected)!.label}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Price</span>
                <span className="font-display font-semibold text-primary">
                  {OPTIONS.find((o) => o.id === selected)!.priceLabel}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1">
                You will be redirected to Stripe to complete payment securely.
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("choose")} disabled={isPending}>Back</Button>
              <Button variant="gold" onClick={handleConfirm} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Pay with Stripe"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BoostDialog;
