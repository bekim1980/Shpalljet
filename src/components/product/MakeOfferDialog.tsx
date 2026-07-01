import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { HandCoins } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { useStartConversation } from "@/hooks/useChat";
import { getMutationErrorMessage } from "@/lib/accountRestriction";
import { formatPrice, type CurrencyCode } from "@/lib/currency";
import { toast } from "sonner";

interface MakeOfferDialogProps {
  productId: string;
  productTitle: string;
  askingPrice: number;
  currency: CurrencyCode;
  sellerId: string | undefined;
  className?: string;
}

const MakeOfferDialog = ({
  productId,
  productTitle,
  askingPrice,
  currency,
  sellerId,
  className,
}: MakeOfferDialogProps) => {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { startConversation } = useStartConversation();
  const [open, setOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = async () => {
    if (!user) {
      navigate("/login", { state: { from: `/product/${productId}` } });
      return;
    }
    if (!sellerId) {
      toast.info(t("product.demoProduct"));
      return;
    }
    if (user.id === sellerId) {
      toast.info(t("product.ownListing"));
      return;
    }

    const price = parseFloat(offerPrice);
    if (!price || price <= 0) {
      toast.error(t("product.offerInvalidPrice"));
      return;
    }

    setSending(true);
    try {
      const result = await startConversation(productId, sellerId);
      if (!result) {
        toast.error(t("product.offerFailed"));
        return;
      }
      const { conversationId, isNew } = result;

      // Send offer as a formatted chat message
      const { supabase } = await import("@/integrations/supabase/client");
      const offerMessage = `💰 ${t("product.offerMessage", {
        price: formatPrice(price, currency),
        title: productTitle,
      })}`;

      const { error: msgError } = await supabase.from("messages").insert({
        conversation_id: conversationId,
        sender_id: user.id,
        content: offerMessage,
      });

      if (!msgError) {
        const { track } = await import("@/lib/analytics");
        track("message_sent_success", {
          dedupeKey: `offer:${conversationId}:${price}`,
          props: {
            product_id: productId,
            seller_id: sellerId,
            buyer_id: user.id,
            conversation_id: conversationId,
            is_first_message: isNew,
            source: "product_detail",
            kind: "offer",
          },
        });
      }

      if (msgError) throw msgError;

      setOpen(false);
      setOfferPrice("");
      navigate(`/messages?conversation=${conversationId}`);
    } catch (err) {
      toast.error(getMutationErrorMessage(err, t("product.offerFailed")));
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="lg" className={className}>
          <HandCoins className="h-4 w-4 mr-1.5" />
          {t("product.makeOffer")}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[380px]">
        <DialogHeader>
          <DialogTitle className="font-display">{t("product.makeOffer")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 pt-2">
          <div className="rounded-lg bg-secondary/40 p-3 text-sm">
            <p className="text-muted-foreground">{productTitle}</p>
            <p className="font-semibold text-foreground mt-1">
              {t("product.askingPrice")}: {formatPrice(askingPrice, currency)}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="offer-price">{t("product.yourOffer")} ({currency})</Label>
            <Input
              id="offer-price"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.00"
              value={offerPrice}
              onChange={(e) => setOfferPrice(e.target.value)}
              autoFocus
            />
          </div>
          <Button
            variant="gold"
            className="w-full"
            onClick={handleSubmit}
            disabled={sending || !offerPrice}
          >
            {sending ? t("common.loading") : t("product.sendOffer")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default MakeOfferDialog;
