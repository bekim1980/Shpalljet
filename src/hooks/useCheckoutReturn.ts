import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";

/**
 * Handles Stripe Checkout return URLs on listing pages.
 * Entitlements are granted by webhook only; this refreshes data and shows status toasts.
 */
export function useCheckoutReturn(productId: string | undefined) {
  const [searchParams, setSearchParams] = useSearchParams();
  const queryClient = useQueryClient();
  const { t } = useTranslation();
  const handledRef = useRef<string | null>(null);

  useEffect(() => {
    const checkout = searchParams.get("checkout");
    if (!checkout || !productId) return;

    const dedupeKey = `${productId}:${checkout}:${searchParams.get("entitlement") ?? ""}`;
    if (handledRef.current === dedupeKey) return;
    handledRef.current = dedupeKey;

    const entitlement = searchParams.get("entitlement") ?? "";
    const isBoost = entitlement.startsWith("boost");

    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["product", productId] });
      queryClient.invalidateQueries({ queryKey: ["my-listings"] });
      queryClient.invalidateQueries({ queryKey: ["search-products"] });
      queryClient.invalidateQueries({ queryKey: ["products"] });
    };

    if (checkout === "success") {
      invalidate();
      // Webhook may arrive slightly after redirect — refresh again shortly.
      window.setTimeout(invalidate, 2500);

      toast.success(
        isBoost
          ? t("payments.checkoutSuccessBoost", "Payment successful — boost will appear shortly.")
          : t("payments.checkoutSuccessPremium", "Payment successful — Premium will appear shortly."),
      );
    } else if (checkout === "cancelled") {
      toast.info(
        t("payments.checkoutCancelled", "Checkout cancelled. No charge was made and your listing is unchanged."),
      );
    } else if (checkout === "failed") {
      toast.error(
        t("payments.checkoutFailed", "Payment failed. No entitlement was granted."),
      );
    }

    const next = new URLSearchParams(searchParams);
    next.delete("checkout");
    next.delete("entitlement");
    setSearchParams(next, { replace: true });
  }, [productId, queryClient, searchParams, setSearchParams, t]);
}
