import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft, Star, MessageCircle, Heart, MapPin, Phone, Clock,
  Tag, Package, Shield, ChevronRight, Briefcase, Building2, ExternalLink, Mail,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useProduct } from "@/hooks/useProducts";
import { useSellerRating } from "@/hooks/useReviews";
import { useWishlist, useToggleWishlist } from "@/hooks/useWishlist";
import { useAuth } from "@/hooks/useAuth";
import { useAuthShellTriggerCapture, useRequireAuthShell } from "@/hooks/useRequireAuthShell";
import { useVertical, type Vertical } from "@/contexts/VerticalContext";
import { useStartConversation } from "@/hooks/useChat";
import { getMutationErrorMessage } from "@/lib/accountRestriction";
import { useRelatedProducts } from "@/hooks/useRelatedProducts";
import { useTranslation } from "react-i18next";
import { formatPrice, type CurrencyCode } from "@/lib/currency";
import Header from "@/components/Header";
import ReviewSection from "@/components/ReviewSection";
import ReportDialog from "@/components/ReportDialog";
import ShareButtons from "@/components/ShareButtons";
import ProductCard from "@/components/ProductCard";
import ImageCarousel from "@/components/product/ImageCarousel";
import MakeOfferDialog from "@/components/product/MakeOfferDialog";
import FullscreenViewer from "@/components/product/FullscreenViewer";
import BoostDialog from "@/components/product/BoostDialog";
import { PAYMENTS_ENABLED } from "@/config/features";
import { useTrackProductView } from "@/hooks/useProductViews";
import { useCheckoutReturn } from "@/hooks/useCheckoutReturn";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { track } from "@/lib/analytics";
import SEO from "@/components/SEO";
import { extractProductId, buildProductSlug } from "@/lib/productSlug";
import { SITE_URL } from "@/components/SEO";
import { getValidSeoImageUrl, buildProductCanonical } from "@/lib/seoImage";
import { pickValidImageUrls } from "@/lib/productImage";

// Quick messages are built at render time using the translation hook (see component below)

const formatPhoneNumber = (phone: string): string => {
  let digits = phone.replace(/[^\d+]/g, "").replace(/^\+/, "");
  if (digits.startsWith("0")) digits = "355" + digits.slice(1);
  return digits;
};

const WhatsAppIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" /></svg>
);

const ViberIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d="M11.4 0C9.473.028 5.333.344 3.02 2.467 1.302 4.187.541 6.783.468 9.973.396 13.163.263 19.122 5.762 20.63h.004l-.004 2.379s-.037.963.598 1.159c.766.236 1.212-.492 1.943-1.283.401-.434.953-1.073 1.37-1.56 3.769.318 6.669-.41 6.999-.521.762-.257 5.073-.8 5.776-6.527.724-5.89-.343-9.618-2.27-11.308C18.845 1.762 15.439.06 11.4 0z" /></svg>
);

/* ── Loading skeleton ── */
const ProductDetailSkeleton = () => (
  <div className="min-h-screen bg-background">
    <Header />
    <div className="md:container md:pt-4">
      <div className="md:grid md:grid-cols-2 md:gap-8">
        <Skeleton className="aspect-square w-full" />
        <div className="px-4 md:px-0 pt-4 space-y-4">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-6 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Separator />
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          <Separator />
          <Skeleton className="h-20 w-full" />
          <div className="flex gap-2">
            <Skeleton className="h-11 flex-1" />
            <Skeleton className="h-11 flex-1" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

/* ── Main page ── */
const ProductDetail = () => {
  const params = useParams();
  // Supports both /product/:id (raw UUID) and /p/:slug (slug ending with UUID).
  const rawParam = params.id || params.slug;
  const id = extractProductId(rawParam);
  const navigate = useNavigate();
  const { user } = useAuth();
  const { requireAuth } = useRequireAuthShell();
  const authCapture = useAuthShellTriggerCapture();
  const { t } = useTranslation();
  const { setVertical } = useVertical();

  const quickMessages = [
    t("product.quickMsg1", "Is this still available?"),
    t("product.quickMsg2", "Can you lower the price?"),
  ];

  const { startConversation } = useStartConversation();
  const { data: dbProduct, isLoading, isError } = useProduct(id);
  const { data: wishlist } = useWishlist();
  const { mutate: toggleWishlist } = useToggleWishlist();
  useTrackProductView(id);
  useCheckoutReturn(id);
  const [showPhone, setShowPhone] = useState(false);
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);

  const product = dbProduct
    ? {
        id: dbProduct.id,
        title: dbProduct.title,
        price: Number(dbProduct.price),
        image: dbProduct.image_urls?.[0] ?? "",
        images: pickValidImageUrls(dbProduct.image_urls, undefined, "listing"),
        seller: {
          id: dbProduct.seller_id,
          name: dbProduct.seller?.display_name ?? t("common.unknown"),
          avatar: dbProduct.seller?.avatar_url ?? "",
          rating: 5.0,
          phone: dbProduct.seller?.phone_number ?? null,
          whatsappEnabled: dbProduct.seller?.whatsapp_enabled ?? false,
          viberEnabled: dbProduct.seller?.viber_enabled ?? false,
        },
        category: dbProduct.category,
        description: dbProduct.description,
        condition: dbProduct.condition,
        contactMethod: dbProduct.contact_method ?? "chat",
        currency: (dbProduct.currency || "EUR") as CurrencyCode,
        country: dbProduct.country || null,
        city: dbProduct.city || null,
        createdAt: dbProduct.created_at,
        vertical: dbProduct.vertical,
        listingType: dbProduct.listing_type,
        isBoosted: dbProduct.is_boosted,
        boostExpiresAt: (dbProduct as any).boost_expires_at ?? null,
        // Jobs
        companyName: (dbProduct as any).company_name ?? null,
        jobType: (dbProduct as any).job_type ?? null,
        salaryMin: (dbProduct as any).salary_min ?? null,
        salaryMax: (dbProduct as any).salary_max ?? null,
        jobLocation: (dbProduct as any).job_location ?? null,
        experienceLevel: (dbProduct as any).experience_level ?? null,
        applicationEmail: (dbProduct as any).application_email ?? null,
        applicationUrl: (dbProduct as any).application_url ?? null,
      }
    : null;

  // Propagate the product's vertical to the theme context so PDP chrome
  // matches MARKET/RENT/SERVICES/JOBS/LUXE rather than defaulting to luxe-gold.
  const productVertical = dbProduct?.vertical as Vertical | undefined;
  useEffect(() => {
    const valid: Vertical[] = ["luxe", "market", "rent", "services", "jobs"];
    if (productVertical && valid.includes(productVertical)) {
      setVertical(productVertical);
    }
  }, [productVertical, setVertical]);

  const { data: sellerRating } = useSellerRating(product?.seller?.id || undefined);
  const { data: relatedProducts } = useRelatedProducts(product?.id, product?.category);
  const isWished = product ? (wishlist?.has(product.id) ?? false) : false;

  const handleWishlist = () => {
    requireAuth(
      () => {
        if (product) toggleWishlist({ productId: product.id, isWished });
      },
      authCapture.pointerOptions(),
    );
  };

  if (id && isLoading) return <ProductDetailSkeleton />;

  if (!id || isError || !product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container py-20 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto">
            <Package className="h-7 w-7 text-muted-foreground/40" />
          </div>
          <p className="text-muted-foreground font-display text-lg">{t("product.notFound")}</p>
          <Button variant="gold-outline" asChild>
            <Link to="/">{t("product.backToHome")}</Link>
          </Button>
        </div>
      </div>
    );
  }

  const handleMessage = async (prefill?: string) => {
    if (!requireAuth(() => {}, authCapture.pointerOptions())) return;
    if (!product.seller.id) { toast.info(t("product.demoProduct")); return; }
    if (user.id === product.seller.id) { toast.info(t("product.ownListing")); return; }
    try {
      const result = await startConversation(product.id, product.seller.id);
      if (result) {
        const { conversationId, isNew } = result;
        // Legacy event (kept for back-compat with existing dashboards)
        track("message_sent", {
          dedupeKey: `${product.id}:${prefill ?? "open"}`,
          props: { id: product.id, prefill: !!prefill, sellerId: product.seller.id },
        });
        // Fire success only when no prefill (prefill auto-sends inside Messages and tracks there)
        if (!prefill) {
          track("message_sent_success", {
            dedupeKey: `open:${conversationId}`,
            props: {
              product_id: product.id,
              seller_id: product.seller.id,
              buyer_id: user.id,
              conversation_id: conversationId,
              is_first_message: isNew,
              source: "product_detail",
            },
          });
        }
        const qs = new URLSearchParams({ conversation: conversationId });
        if (prefill) qs.set("prefill", prefill);
        navigate(`/messages?${qs.toString()}`);
      }
    } catch (err) {
      toast.error(getMutationErrorMessage(err, t("product.messageFailed", "Dështoi hapja e bisedës")));
    }
  };

  const handleContact = () => {
    if (!requireAuth(() => {}, authCapture.pointerOptions())) return;
    if (product.seller.phone) { setShowPhone(true); } else { toast.info(t("product.noPhone")); handleMessage(); }
  };

  const handleWhatsApp = () => {
    if (!requireAuth(() => {}, authCapture.pointerOptions())) return;
    if (!product.seller.phone) { toast.info(t("product.noPhone")); return; }
    const num = formatPhoneNumber(product.seller.phone);
    const text = encodeURIComponent(t("product.interestedIn", { title: product.title }));
    window.open(`https://wa.me/${num}?text=${text}`, "_blank", "noopener");
  };

  const handleViber = () => {
    if (!requireAuth(() => {}, authCapture.pointerOptions())) return;
    if (!product.seller.phone) { toast.info(t("product.noPhone")); return; }
    const num = formatPhoneNumber(product.seller.phone);
    window.open(`viber://chat?number=%2B${num}`, "_blank", "noopener");
  };

  const ratingValue = sellerRating?.count ? sellerRating.average : product.seller.rating;
  const ratingLabel = sellerRating?.count
    ? `${sellerRating.average} (${sellerRating.count} ${t("product.reviews")})`
    : `${product.seller.rating} ${t("product.review")}`;

  const allImages = product.images.length > 0 ? product.images : product.image ? [product.image] : [];
  const showWhatsApp = product.seller.whatsappEnabled && product.seller.phone;
  const showViber = product.seller.viberEnabled && product.seller.phone;
  const locationText = [product.city, product.country].filter(Boolean).join(", ");
  const timeAgo = formatDistanceToNow(new Date(product.createdAt), { addSuffix: true });

  const isJob = product.vertical === "jobs" || product.category === "jobs";
  const salaryRange =
    product.salaryMin || product.salaryMax
      ? `${product.salaryMin ? formatPrice(Number(product.salaryMin), product.currency) : "—"} – ${product.salaryMax ? formatPrice(Number(product.salaryMax), product.currency) : "—"}`
      : null;

  const handleApply = () => {
    track("job_apply_click", {
      dedupeKey: `apply:${product.id}`,
      props: { product_id: product.id, has_url: !!product.applicationUrl, has_email: !!product.applicationEmail },
    });
    if (product.applicationUrl) {
      window.open(product.applicationUrl, "_blank", "noopener,noreferrer");
    } else if (product.applicationEmail) {
      window.location.href = `mailto:${product.applicationEmail}?subject=${encodeURIComponent("Application: " + product.title)}`;
    } else {
      handleMessage();
    }
  };

  const conditionColors: Record<string, string> = {
    new: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
    "like-new": "bg-sky-500/15 text-sky-400 border-sky-500/20",
    good: "bg-amber-500/15 text-amber-400 border-amber-500/20",
    used: "bg-muted text-muted-foreground border-border/40",
  };

  const productJsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: (product.description || product.title).slice(0, 300),
    image: product.images?.length ? product.images : undefined,
    category: product.category,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: product.currency || "EUR",
      availability: "https://schema.org/InStock",
      url: typeof window !== "undefined" ? window.location.href : undefined,
    },
  };

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-0">
      <SEO
        title={`${product.title} — Shpalljet`}
        description={(product.description || product.title).slice(0, 160)}
        image={getValidSeoImageUrl(product.images)}
        type="product"
        canonical={buildProductCanonical(product.title, product.id, buildProductSlug)}
        jsonLd={productJsonLd}
      />
      <Header />

      <div className="md:container md:pt-4">
        {/* Desktop back */}
        <button
          onClick={() => navigate(-1)}
          className="hidden md:inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-3"
        >
          <ArrowLeft className="h-4 w-4" />{t("product.backToListings")}
        </button>

        <div className="md:grid md:grid-cols-[1.1fr_1fr] md:gap-8">
          {/* ── LEFT: Image carousel ── */}
          <div className="md:rounded-xl md:overflow-hidden md:border md:border-border/30 md:sticky md:top-4 md:self-start">
            <ImageCarousel
              images={allImages}
              onImageTap={(i) => setFullscreenIdx(i)}
              isWished={isWished}
              onWishlist={handleWishlist}
              onWishlistPointerDown={authCapture.onPointerDown}
              condition={product.condition}
            />
          </div>

          {/* ── RIGHT: Product details ── */}
          <div className="px-4 md:px-0 pt-3 pb-6 space-y-5">
            {/* Mobile back */}
            <button
              onClick={() => navigate(-1)}
              className="md:hidden inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground -mt-1"
            >
              <ArrowLeft className="h-3.5 w-3.5" />{t("product.backToListings")}
            </button>

            {/* ── Above-the-fold: Price + Title + Meta ── */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-2">
              <div className="flex items-start justify-between gap-3">
                <p className="text-2xl md:text-3xl font-bold text-primary leading-tight">
                  {formatPrice(product.price, product.currency)}
                </p>
                {product.isBoosted && (
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 shrink-0 text-[10px]">
                    ⚡ {t("sell.boosted")}
                  </Badge>
                )}
              </div>
              <h1 className="font-display text-lg md:text-xl font-semibold leading-tight">{product.title}</h1>

              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                {locationText && (
                  <span className="inline-flex items-center gap-1">
                    <MapPin className="h-3 w-3" />{locationText}
                  </span>
                )}
                <span className="inline-flex items-center gap-1">
                  <Clock className="h-3 w-3" />{timeAgo}
                </span>
                <Badge
                  variant="outline"
                  className={`text-[10px] capitalize border ${conditionColors[product.condition] || conditionColors.used}`}
                >
                  {product.condition}
                </Badge>
              </div>
            </motion.div>

            <Separator className="bg-border/40" />

            {/* ── Seller trust card ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-center gap-3"
            >
              <div className="w-11 h-11 rounded-full bg-secondary flex items-center justify-center font-bold text-muted-foreground overflow-hidden border border-border/50 shrink-0">
                {product.seller.avatar
                  ? <img src={product.seller.avatar} alt="" className="w-full h-full object-cover" />
                  : <span className="text-sm">{product.seller.name.charAt(0).toUpperCase()}</span>}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="font-medium text-sm truncate">{product.seller.name}</p>
                  <Shield className="h-3.5 w-3.5 text-primary/60 shrink-0" />
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="inline-flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-primary text-primary" />
                    {ratingLabel}
                  </span>
                </div>
              </div>
              <ReportDialog reportedType="product" reportedId={product.id} />
            </motion.div>

            <Separator className="bg-border/40" />

            {/* ── Desktop CTA buttons ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="hidden md:block space-y-2"
            >
              <div className="flex gap-2">
                {isJob ? (
                  <>
                    <Button variant="gold" size="lg" className="flex-1 h-12 text-base font-semibold shadow-gold" onClick={handleApply}>
                      {product.applicationUrl ? <ExternalLink className="h-5 w-5 mr-2" /> : product.applicationEmail ? <Mail className="h-5 w-5 mr-2" /> : <MessageCircle className="h-5 w-5 mr-2" />}
                      {t("product.apply", "Apply now")}
                    </Button>
                    <Button variant="gold-outline" size="lg" className="h-12 px-4" onPointerDown={authCapture.onPointerDown} onClick={() => void handleMessage()}>
                      <MessageCircle className="h-4 w-4 mr-2" />{t("product.sendMessage", "Send message")}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button variant="gold" size="lg" className="flex-1 h-12" onPointerDown={authCapture.onPointerDown} onClick={handleContact}>
                      <Phone className="h-4 w-4 mr-2" />{t("product.call", "Thirrje")}
                    </Button>
                    <Button variant="gold-outline" size="lg" className="flex-1 h-12" onPointerDown={authCapture.onPointerDown} onClick={() => void handleMessage()}>
                      <MessageCircle className="h-4 w-4 mr-2" />{t("product.sendMessage", "Send message")}
                    </Button>
                  </>
                )}
              </div>
              {/* Quick message chips — one-tap suggestions */}
              {user?.id !== product.seller.id && (
                <div className="flex flex-wrap gap-2">
                  {quickMessages.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onPointerDown={authCapture.onPointerDown}
                      onClick={() => void handleMessage(q)}
                      className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-secondary/40 text-foreground/80 hover:border-primary/50 hover:text-primary transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {user?.id !== product.seller.id && (
                <MakeOfferDialog
                  productId={product.id}
                  productTitle={product.title}
                  askingPrice={product.price}
                  currency={product.currency}
                  sellerId={product.seller.id}
                  className="w-full h-11"
                />
              )}
              {(showWhatsApp || showViber) && (
                <div className="flex gap-2">
                  {showWhatsApp && (
                    <Button size="default" className="flex-1 bg-[#25D366] hover:bg-[#1da851] text-white border-0" onPointerDown={authCapture.onPointerDown} onClick={handleWhatsApp}>
                      <WhatsAppIcon className="h-4 w-4 mr-1.5" />WhatsApp
                    </Button>
                  )}
                  {showViber && (
                    <Button size="default" className="flex-1 bg-[#7360F2] hover:bg-[#5a48d4] text-white border-0" onPointerDown={authCapture.onPointerDown} onClick={handleViber}>
                      <ViberIcon className="h-4 w-4 mr-1.5" />Viber
                    </Button>
                  )}
                </div>
              )}
              {showPhone && product.seller.phone && (
                <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }} className="rounded-lg border border-border/40 p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <Phone className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground">{t("product.phoneNumber")}</p>
                    <a href={`tel:${product.seller.phone}`} className="text-base font-semibold text-primary hover:underline">
                      {product.seller.phone}
                    </a>
                  </div>
                </motion.div>
              )}
            </motion.div>

            {/* ── Owner-only: Boost listing CTA (purchase) or active boost status ── */}
            {user?.id === product.seller.id && PAYMENTS_ENABLED && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">🚀 Boost this listing</p>
                  <p className="text-[11px] text-muted-foreground">
                    {product.isBoosted && product.boostExpiresAt && new Date(product.boostExpiresAt) > new Date()
                      ? `Boost active until ${new Date(product.boostExpiresAt).toLocaleDateString()}`
                      : "Rank higher in search and browse"}
                  </p>
                </div>
                <BoostDialog
                  productId={product.id}
                  productTitle={product.title}
                  currentBoostExpiresAt={product.boostExpiresAt}
                />
              </div>
            )}
            {user?.id === product.seller.id && !PAYMENTS_ENABLED && product.isBoosted && product.boostExpiresAt && new Date(product.boostExpiresAt) > new Date() && (
              <div className="rounded-lg border border-border/40 bg-secondary/20 p-3">
                <p className="text-sm font-medium">{t("sell.boosted")}</p>
                <p className="text-[11px] text-muted-foreground">
                  Boost active until {new Date(product.boostExpiresAt).toLocaleDateString()}
                </p>
              </div>
            )}

            {/* ── Jobs info card ── */}
            {isJob && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.12 }}
                className="rounded-xl border border-border/40 bg-secondary/30 p-3 space-y-2"
              >
                <div className="flex items-center gap-2 text-sm font-semibold">
                  <Briefcase className="h-4 w-4 text-primary" />
                  {t("product.jobDetails", "Job details")}
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {product.companyName && (
                    <div className="flex items-start gap-1.5"><Building2 className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><p className="text-[10px] uppercase text-muted-foreground">{t("sell.companyName", "Company")}</p><p className="font-medium">{product.companyName}</p></div></div>
                  )}
                  {product.jobType && (
                    <div className="flex items-start gap-1.5"><Tag className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><p className="text-[10px] uppercase text-muted-foreground">{t("sell.jobType", "Type")}</p><p className="font-medium capitalize">{product.jobType}</p></div></div>
                  )}
                  {product.jobLocation && (
                    <div className="flex items-start gap-1.5"><MapPin className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><p className="text-[10px] uppercase text-muted-foreground">{t("sell.jobLocation", "Location")}</p><p className="font-medium">{product.jobLocation}</p></div></div>
                  )}
                  {product.experienceLevel && (
                    <div className="flex items-start gap-1.5"><Shield className="h-3.5 w-3.5 text-muted-foreground mt-0.5" /><div><p className="text-[10px] uppercase text-muted-foreground">{t("sell.experienceLevel", "Experience")}</p><p className="font-medium capitalize">{product.experienceLevel}</p></div></div>
                  )}
                  {salaryRange && (
                    <div className="flex items-start gap-1.5 col-span-2"><Star className="h-3.5 w-3.5 text-primary mt-0.5" /><div><p className="text-[10px] uppercase text-muted-foreground">{t("product.salaryRange", "Salary range")}</p><p className="font-semibold text-primary">{salaryRange}</p></div></div>
                  )}
                </div>
                <Button variant="gold" size="lg" className="w-full h-14 mt-1 text-base font-semibold shadow-gold" onClick={handleApply}>
                  {product.applicationUrl ? <ExternalLink className="h-5 w-5 mr-2" /> : product.applicationEmail ? <Mail className="h-5 w-5 mr-2" /> : <MessageCircle className="h-5 w-5 mr-2" />}
                  {t("product.apply", "Apply now")}
                </Button>
              </motion.div>
            )}

            {/* ── Description ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-2"
            >
              <h2 className="font-display text-sm font-semibold">{t("sell.description")}</h2>
              <p className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">
                {product.description || t("product.noDescription", "No description provided.")}
              </p>
            </motion.div>

            <Separator className="bg-border/40" />

            {/* ── Product details grid ── */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="space-y-2"
            >
              <h2 className="font-display text-sm font-semibold">{t("product.details", "Details")}</h2>
              <div className="grid grid-cols-2 gap-2">
                <DetailItem icon={Tag} label={t("sell.category")} value={product.category} />
                <DetailItem icon={Package} label={t("sell.condition")} value={product.condition} />
                {locationText && <DetailItem icon={MapPin} label={t("sell.location")} value={locationText} />}
                {product.listingType && (
                  <DetailItem
                    icon={Shield}
                    label={t("sell.listingType")}
                    value={product.listingType === "paid" ? "Premium" : t("sell.freeListing")}
                  />
                )}
              </div>
            </motion.div>

            <ShareButtons title={product.title} productId={product.id} />

            {/* ── Reviews ── */}
            {product.seller.id && (
              <ReviewSection sellerId={product.seller.id} productId={product.id} />
            )}
          </div>
        </div>

        {/* ── Related listings ── */}
        {relatedProducts && relatedProducts.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="px-4 md:px-0 py-6 space-y-3"
          >
            <div className="flex items-center justify-between">
              <h2 className="font-display text-base font-semibold">
                {t("product.relatedListings", "Similar Listings")}
              </h2>
              <Link
                to={`/search?category=${product.category}`}
                className="text-xs text-primary hover:underline inline-flex items-center gap-0.5"
              >
                {t("product.viewAll", "View all")}
                <ChevronRight className="h-3 w-3" />
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {relatedProducts.slice(0, 6).map((p, i) => (
                <ProductCard
                  key={p.id}
                  index={i}
                  product={{
                    id: p.id,
                    title: p.title,
                    price: p.price,
                    image: p.image_urls?.[0] ?? "",
                    image_urls: p.image_urls,
                    seller: {
                      name: p.seller?.display_name ?? t("common.unknown"),
                      avatar: p.seller?.avatar_url ?? "",
                      rating: 5.0,
                    },
                    category: p.category,
                    description: p.description,
                    condition: p.condition,
                    currency: p.currency,
                    country: p.country,
                    city: p.city,
                    views_count: (p as any).views_count ?? 0,
                    messages_count: (p as any).messages_count ?? 0,
                    is_boosted: !!(p as any).is_boosted,
                    boost_expires_at: (p as any).boost_expires_at ?? null,
                    created_at: (p as any).created_at ?? null,
                    price_history: (p as any).price_history ?? null,
                  }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* ── Sticky mobile CTA bar ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border/40 px-4 py-3 safe-bottom">
        <div className="flex gap-2">
          {isJob ? (
            <>
              <Button variant="gold" size="lg" className="flex-1 h-14 text-base font-semibold shadow-gold" onClick={handleApply}>
                {product.applicationUrl ? <ExternalLink className="h-5 w-5 mr-2" /> : product.applicationEmail ? <Mail className="h-5 w-5 mr-2" /> : <MessageCircle className="h-5 w-5 mr-2" />}
                {t("product.apply", "Apply now")}
              </Button>
              <Button variant="gold-outline" size="lg" className="h-14 px-3" onPointerDown={authCapture.onPointerDown} onClick={() => void handleMessage()} aria-label={t("product.sendMessage", "Send message")}>
                <MessageCircle className="h-5 w-5" />
              </Button>
            </>
          ) : (
            <>
              <Button variant="gold" size="lg" className="flex-1 h-12" onPointerDown={authCapture.onPointerDown} onClick={handleContact}>
                <Phone className="h-4 w-4 mr-1.5" />{t("product.call", "Thirrje")}
              </Button>
              <Button variant="gold-outline" size="lg" className="flex-1 h-12" onPointerDown={authCapture.onPointerDown} onClick={() => void handleMessage()}>
                <MessageCircle className="h-4 w-4 mr-1.5" />{t("product.sendMessage", "Send message")}
              </Button>
            </>
          )}
        </div>
        {!isJob && user?.id !== product.seller.id && (
          <MakeOfferDialog
            productId={product.id}
            productTitle={product.title}
            askingPrice={product.price}
            currency={product.currency}
            sellerId={product.seller.id}
            className="w-full h-10 mt-2"
          />
        )}
      </div>

      {/* ── Mobile phone reveal (shown above CTA) ── */}
      {showPhone && product.seller.phone && (
        <div className="md:hidden fixed bottom-[68px] left-0 right-0 z-40 px-4 pb-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-border/40 bg-background p-3 flex items-center gap-3 shadow-lg"
          >
            <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
              <Phone className="h-4 w-4 text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">{t("product.phoneNumber")}</p>
              <a href={`tel:${product.seller.phone}`} className="text-base font-semibold text-primary hover:underline">
                {product.seller.phone}
              </a>
            </div>
            {showWhatsApp && (
              <button onPointerDown={authCapture.onPointerDown} onClick={handleWhatsApp} className="p-2 rounded-full bg-[#25D366] text-white">
                <WhatsAppIcon className="h-4 w-4" />
              </button>
            )}
            {showViber && (
              <button onPointerDown={authCapture.onPointerDown} onClick={handleViber} className="p-2 rounded-full bg-[#7360F2] text-white">
                <ViberIcon className="h-4 w-4" />
              </button>
            )}
          </motion.div>
        </div>
      )}

      {/* ── Fullscreen viewer ── */}
      {fullscreenIdx !== null && allImages.length > 0 && (
        <FullscreenViewer images={allImages} startIndex={fullscreenIdx} onClose={() => setFullscreenIdx(null)} />
      )}
    </div>
  );
};

/* ── Detail item helper ── */
const DetailItem = ({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) => (
  <div className="flex items-start gap-2 p-2.5 rounded-lg bg-secondary/30 border border-border/20">
    <Icon className="h-3.5 w-3.5 text-muted-foreground mt-0.5 shrink-0" />
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">{label}</p>
      <p className="text-xs font-medium capitalize truncate">{value}</p>
    </div>
  </div>
);

export default ProductDetail;
