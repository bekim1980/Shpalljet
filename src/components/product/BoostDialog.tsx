// Boost simulation dialog: 24h / 3d / 7d at simulated prices.
// Confirms before applying, then sets is_boosted + boost_expires_at via useUpdateListing.
// No real payment — pure simulation until Stripe is wired in.
import { useState } from "react";
import { Rocket, Loader2, CheckCircle2 } from "lucide-react";
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
import { useUpdateListing } from "@/hooks/useMyListings";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { track } from "@/lib/analytics";

type BoostOption = { id: "24h" | "3d" | "7d"; label: string; days: number; price: string };

const OPTIONS: BoostOption[] = [
  { id: "24h", label: "24 hours", days: 1, price: "€2" },
  { id: "3d", label: "3 days", days: 3, price: "€5" },
  { id: "7d", label: "7 days", days: 7, price: "€10" },
];

interface BoostDialogProps {
  productId: string;
  productTitle?: string;
  trigger?: React.ReactNode;
  /** When boost is already active, pass expiry to inform the user. */
  currentBoostExpiresAt?: string | null;
}

const BoostDialog = ({ productId, productTitle, trigger, currentBoostExpiresAt }: BoostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<BoostOption["id"]>("3d");
  const [step, setStep] = useState<"choose" | "confirm">("choose");
  const { mutate: updateListing, isPending } = useUpdateListing();
  const queryClient = useQueryClient();

  const activeUntil = currentBoostExpiresAt && new Date(currentBoostExpiresAt) > new Date()
    ? currentBoostExpiresAt
    : null;

  const handleConfirm = () => {
    const opt = OPTIONS.find((o) => o.id === selected)!;
    // Stack on top of any active boost so users don't lose remaining time
    const baseMs = activeUntil ? new Date(activeUntil).getTime() : Date.now();
    const expires = new Date(baseMs + opt.days * 24 * 60 * 60 * 1000).toISOString();

    updateListing(
      { id: productId, updates: { is_boosted: true, boost_expires_at: expires } as any },
      {
        onSuccess: () => {
          track("boost_confirm", {
            // dedupe per (product, duration) within session — re-confirms with a different duration still fire
            dedupeKey: `${productId}:${opt.id}`,
            props: { id: productId, duration: opt.id, days: opt.days, price: opt.price },
          });
          toast.success(`🚀 Boosted for ${opt.label} (simulated ${opt.price})`);
          // Refresh ranked surfaces so the new boost lift is visible immediately
          queryClient.invalidateQueries({ queryKey: ["search-products"] });
          queryClient.invalidateQueries({ queryKey: ["product", productId] });
          setOpen(false);
          setStep("choose");
        },
        onError: () => toast.error("Could not start boost. Try again."),
      },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setStep("choose");
        if (o) {
          // dedupe per product per session — opening again later still shouldn't double count quickly
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
                    <p className="font-display text-lg font-semibold text-primary mt-1">{opt.price}</p>
                  </button>
                );
              })}
            </div>
            <p className="text-[11px] text-muted-foreground -mt-1">
              Payments coming soon — this is a free preview.
            </p>
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
                  {OPTIONS.find((o) => o.id === selected)!.price}
                </span>
              </div>
              <p className="text-[11px] text-muted-foreground pt-1 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                Simulated checkout — no card required during preview.
              </p>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={() => setStep("choose")} disabled={isPending}>Back</Button>
              <Button variant="gold" onClick={handleConfirm} disabled={isPending}>
                {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Confirm boost"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BoostDialog;
