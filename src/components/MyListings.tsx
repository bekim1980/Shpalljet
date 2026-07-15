import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Edit2, Trash2, Eye, EyeOff, Loader2, RotateCcw, Clock, Sparkles, Rocket, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useMyListings, useDeleteListing, useUpdateListing } from "@/hooks/useMyListings";
import BoostDialog from "@/components/product/BoostDialog";
import { categoryLabels } from "@/hooks/useProducts";
import { pickFirstValidImageUrl } from "@/lib/productImage";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import { useLocale } from "@/contexts/LocaleContext";
import { formatPrice, type CurrencyCode } from "@/lib/currency";
import { buildFreeRenewalUpdates } from "@/lib/entitlementSecurity";
import { useAuth } from "@/hooks/useAuth";
import { CheckoutAuthError, CheckoutConfigError, redirectToCheckout } from "@/lib/createCheckoutSession";
import { CATALOG_DISPLAY } from "@/lib/entitlementCatalogDisplay";

const CATEGORIES = [
  { value: "watches", label: "Orë" },
  { value: "bags", label: "Çanta" },
  { value: "books", label: "Libra" },
  { value: "audio", label: "Audio" },
  { value: "jewelry", label: "Bizhuteri" },
  { value: "clothing", label: "Veshje" },
  { value: "other", label: "Tjetër" },
];

const CONDITIONS = [
  { value: "new", label: "I Ri" },
  { value: "like-new", label: "Si i Ri" },
  { value: "used", label: "I Përdorur" },
];

const getDaysLeft = (expiresAt: string | null): number | null => {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
};

const MyListings = () => {
  const { t } = useTranslation();
  const { currency: defaultCurrency } = useLocale();
  const { session } = useAuth();
  const { data: listings, isLoading } = useMyListings();
  const { mutate: deleteListing } = useDeleteListing();
  const { mutate: updateListing, isPending: isUpdating } = useUpdateListing();
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [editForm, setEditForm] = useState({ title: "", description: "", price: "", category: "", condition: "" });
  const [renewingId, setRenewingId] = useState<string | null>(null);
  const [searchParams, setSearchParams] = useSearchParams();
  const titleInputRef = useRef<HTMLInputElement>(null);
  const priceInputRef = useRef<HTMLInputElement>(null);
  const descInputRef = useRef<HTMLTextAreaElement>(null);
  const focusField = searchParams.get("focus");
  const handledDeepLinkRef = useRef<string | null>(null);

  const openEdit = (product: any) => {
    setEditingProduct(product);
    setEditForm({
      title: product.title,
      description: product.description || "",
      price: String(product.price),
      category: product.category,
      condition: product.condition,
    });
  };

  // Deep link: ?edit=<id>&focus=<title|price|description|images>
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (!editId || !listings?.length) return;
    if (handledDeepLinkRef.current === editId) return;
    const target = (listings as any[]).find((l) => l.id === editId);
    if (!target) return;
    handledDeepLinkRef.current = editId;
    openEdit(target);
    // Strip the params after consuming so refresh doesn't re-trigger
    const next = new URLSearchParams(searchParams);
    next.delete("edit");
    next.delete("focus");
    setSearchParams(next, { replace: true });
  }, [listings, searchParams, setSearchParams]);

  // Focus the requested field once dialog opens
  useEffect(() => {
    if (!editingProduct || !focusField) return;
    const tm = setTimeout(() => {
      const target =
        focusField === "price" ? priceInputRef.current
        : focusField === "description" ? descInputRef.current
        : titleInputRef.current;
      if (target) {
        target.focus();
        try { (target as HTMLInputElement).select?.(); } catch { /* noop */ }
        target.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }, 120);
    return () => clearTimeout(tm);
  }, [editingProduct, focusField]);

  const handleUpdate = () => {
    if (!editingProduct) return;
    updateListing(
      {
        id: editingProduct.id,
        updates: {
          title: editForm.title.trim(),
          description: editForm.description.trim(),
          price: parseFloat(editForm.price),
          category: editForm.category,
          condition: editForm.condition,
        },
      },
      { onSuccess: () => setEditingProduct(null) }
    );
  };

  const toggleStatus = (product: any) => {
    updateListing({
      id: product.id,
      updates: { status: product.status === "active" ? "inactive" : "active" },
    });
  };

  const startPaidCheckout = async (
    product: any,
    entitlementType: "premium_renew" | "auto_renew_on",
  ) => {
    if (!session?.access_token) {
      toast.error(t("payments.signInRequired", "Please sign in to continue."));
      return;
    }
    setRenewingId(product.id);
    try {
      await redirectToCheckout({
        productId: product.id,
        entitlementType,
        accessToken: session.access_token,
      });
    } catch (err) {
      if (err instanceof CheckoutConfigError) {
        toast.error(t("payments.notConfigured", "Payments are not configured yet."));
      } else if (err instanceof CheckoutAuthError) {
        toast.error(t("payments.signInRequired", "Please sign in to continue."));
      } else {
        toast.error(err instanceof Error ? err.message : t("payments.checkoutFailed"));
      }
      setRenewingId(null);
    }
  };

  const handleRenew = (product: any, type: "free" | "paid") => {
    if (type === "paid") {
      void startPaidCheckout(product, "premium_renew");
      return;
    }
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    setRenewingId(product.id);
    updateListing(
      {
        id: product.id,
        updates: buildFreeRenewalUpdates(expiresAt),
      },
      {
        onSuccess: () => {
          toast.success(t("sell.renewSuccess"));
          setRenewingId(null);
        },
        onError: () => setRenewingId(null),
      }
    );
  };

  const toggleAutoRenew = (product: any, enable: boolean) => {
    if (!enable) {
      toast.info(t("payments.autoRenewDisableHint", "Auto-renew remains active until the current period ends."));
      return;
    }
    if ((product as any).auto_renew) return;
    void startPaidCheckout(product, "auto_renew_on");
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
      </div>
    );
  }

  if (!listings?.length) {
    return (
      <div className="text-center py-8 text-muted-foreground text-sm">
        {t("myListings.noListings")}
      </div>
    );
  }

  return (
    <>
      <div className="space-y-3">
        {listings.map((product: any) => {
          const daysLeft = getDaysLeft(product.expires_at);
          const isExpired = product.status === "expired";
          const listingType = product.listing_type || "free";

          return (
            <div key={product.id} className={`glass-card rounded-lg p-3 flex gap-3 items-center ${isExpired ? "opacity-70" : ""}`}>
              <div className="w-14 h-14 rounded-md bg-secondary/50 shrink-0 overflow-hidden">
                {pickFirstValidImageUrl(product.image_urls, null, "card") ? (
                  <img
                    src={pickFirstValidImageUrl(product.image_urls, null, "card")!}
                    alt=""
                    className="w-full h-full object-cover"
                    loading="lazy"
                    decoding="async"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground/30 text-[10px]">
                    {categoryLabels[product.category] || product.category}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{product.title}</p>
                <p className="text-sm text-primary font-semibold">{formatPrice(Number(product.price), (product.currency || defaultCurrency) as CurrencyCode)}</p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isExpired ? "bg-orange-500/10 text-orange-500" :
                    product.status === "active" ? "bg-green-500/10 text-green-500" : "bg-muted text-muted-foreground"
                  }`}>
                    {isExpired ? t("sell.expired") : product.status === "active" ? t("myListings.active") : t("myListings.inactive")}
                  </span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    listingType === "paid" ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {listingType === "paid" ? <><Sparkles className="h-2.5 w-2.5 inline mr-0.5" />Premium</> : <><Clock className="h-2.5 w-2.5 inline mr-0.5" />{t("sell.freeListing")}</>}
                  </span>
                  {(product as any).is_boosted && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-500">
                      <Rocket className="h-2.5 w-2.5 inline mr-0.5" />{t("sell.boosted")}
                    </span>
                  )}
                  {daysLeft !== null && !isExpired && (
                    <span className="text-[10px] text-muted-foreground">
                      {t("sell.daysLeft", { days: daysLeft })}
                    </span>
                  )}
                </div>
                {/* Auto-renew toggle */}
                {!isExpired && product.status === "active" && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <Switch
                      checked={(product as any).auto_renew ?? false}
                      onCheckedChange={(checked) => toggleAutoRenew(product, checked)}
                      className="scale-75 origin-left"
                    />
                    <span className="text-[10px] text-muted-foreground">{t("sell.autoRenew")}</span>
                  </div>
                )}
              </div>
              <div className="flex gap-1 shrink-0">
                {isExpired ? (
                  <div className="flex flex-col gap-1">
                    <button
                      onClick={() => handleRenew(product, "free")}
                      disabled={renewingId === product.id}
                      className="px-2 py-1 rounded-md bg-secondary/80 hover:bg-secondary text-[10px] font-medium text-foreground transition-colors flex items-center gap-1"
                    >
                      {renewingId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><RotateCcw className="h-3 w-3" />7d</>}
                    </button>
                    <button
                      onClick={() => handleRenew(product, "paid")}
                      disabled={renewingId === product.id}
                      className="px-2 py-1 rounded-md bg-primary/10 hover:bg-primary/20 text-[10px] font-medium text-primary transition-colors flex items-center gap-1"
                    >
                      {renewingId === product.id ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Sparkles className="h-3 w-3" />{CATALOG_DISPLAY.premium_renew.durationLabel}</>}
                    </button>
                  </div>
                ) : (
                  <>
                    {!product.is_boosted && (
                      <BoostDialog
                        productId={product.id}
                        productTitle={product.title}
                        currentBoostExpiresAt={product.boost_expires_at}
                        trigger={
                          <button className="p-1.5 rounded-md hover:bg-amber-500/10 transition-colors text-muted-foreground hover:text-amber-500" title={t("sell.boost")}>
                            <Rocket className="h-4 w-4" />
                          </button>
                        }
                      />
                    )}
                    <button onClick={() => toggleStatus(product)} className="p-1.5 rounded-md hover:bg-secondary/80 transition-colors text-muted-foreground">
                      {product.status === "active" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                    <button onClick={() => openEdit(product)} className="p-1.5 rounded-md hover:bg-secondary/80 transition-colors text-muted-foreground">
                      <Edit2 className="h-4 w-4" />
                    </button>
                  </>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <button className="p-1.5 rounded-md hover:bg-destructive/10 transition-colors text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>{t("myListings.deleteTitle")}</AlertDialogTitle>
                      <AlertDialogDescription>
                        {t("myListings.deleteDescription")}
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                      <AlertDialogAction onClick={() => deleteListing(product.id)} className="bg-destructive hover:bg-destructive/90">
                        {t("myListings.confirmDelete")}
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit Dialog */}
      <Dialog open={!!editingProduct} onOpenChange={(open) => !open && setEditingProduct(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">{t("myListings.editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label>{t("myListings.titleLabel")}</Label>
              <Input ref={titleInputRef} value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("myListings.descriptionLabel")}</Label>
              <Textarea ref={descInputRef} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>{t("myListings.priceLabel")}</Label>
              <Input ref={priceInputRef} type="number" step="0.01" value={editForm.price} onChange={(e) => setEditForm({ ...editForm, price: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>{t("myListings.categoryLabel")}</Label>
                <Select value={editForm.category} onValueChange={(v) => setEditForm({ ...editForm, category: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t("myListings.conditionLabel")}</Label>
                <Select value={editForm.condition} onValueChange={(v) => setEditForm({ ...editForm, condition: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button variant="gold" className="w-full" onClick={handleUpdate} disabled={isUpdating}>
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : t("myListings.saveChanges")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default MyListings;
