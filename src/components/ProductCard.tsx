import { useState, useRef } from "react";
import { Star, Heart, MapPin, ChevronLeft, ChevronRight, MessageCircle, Sparkles, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { formatDistanceToNow } from "date-fns";
import { useAuth } from "@/hooks/useAuth";
import { useAuthShellTriggerCapture, useRequireAuthShell } from "@/hooks/useRequireAuthShell";
import { useWishlist, useToggleWishlist } from "@/hooks/useWishlist";
import { useLocale } from "@/contexts/LocaleContext";
import { formatPrice, type CurrencyCode } from "@/lib/currency";
import { supabase } from "@/integrations/supabase/client";
import { computeBadges } from "@/lib/productBadges";
import { track } from "@/lib/analytics";
import { pickValidImageUrls } from "@/lib/productImage";
import ThumbImage from "@/components/common/ThumbImage";

interface ProductCardProduct {
  id: string;
  title: string;
  price: number;
  image: string;
  image_urls?: string[];
  seller: { name: string; avatar: string; rating: number };
  category: string;
  description: string;
  condition: string;
  currency?: string;
  country?: string | null;
  city?: string | null;
  // Optional engagement / boost / history signals for badges + stats
  views_count?: number | null;
  messages_count?: number | null;
  is_boosted?: boolean | null;
  boost_expires_at?: string | null;
  created_at?: string | null;
  price_history?: unknown;
}

const ProductCard = ({ product, index, imageSize = "card" }: { product: ProductCardProduct; index: number; imageSize?: "thumb" | "card" }) => {
  const { user } = useAuth();
  const { requireAuth } = useRequireAuthShell();
  const authCapture = useAuthShellTriggerCapture();
  const { data: wishlist } = useWishlist();
  const { mutate: toggleWishlist } = useToggleWishlist();
  const { currency: defaultCurrency } = useLocale();
  const [activeImg, setActiveImg] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const isWished = wishlist?.has(product.id) ?? false;
  const productCurrency = (product.currency as CurrencyCode) || defaultCurrency;

  const images = pickValidImageUrls(product.image_urls, product.image, imageSize);

  const handleWishlist = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    requireAuth(
      () => toggleWishlist({ productId: product.id, isWished }),
      authCapture.pointerOptions(),
    );
  };

  const scrollTo = (idx: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = Math.max(0, Math.min(idx, images.length - 1));
    setActiveImg(next);
    scrollRef.current?.children[next]?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  };

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollLeft = el.scrollLeft;
    const itemWidth = el.clientWidth;
    const newIdx = Math.round(scrollLeft / itemWidth);
    if (newIdx !== activeImg) setActiveImg(newIdx);
  };

  const locationText = [product.city, product.country].filter(Boolean).join(", ");
  const badges = computeBadges(product);
  const views = product.views_count ?? 0;
  const messages = product.messages_count ?? 0;
  const isBoostedActive =
    !!product.is_boosted &&
    !!product.boost_expires_at &&
    new Date(product.boost_expires_at).getTime() > Date.now();
  const createdAtMs = product.created_at ? new Date(product.created_at).getTime() : 0;
  const isNewToday = createdAtMs > 0 && Date.now() - createdAtMs < 24 * 60 * 60 * 1000;
  const timeAgo = createdAtMs > 0 ? formatDistanceToNow(new Date(createdAtMs), { addSuffix: true }) : "";

  // Pick ONE dynamic info line by priority: contacts > views > new today
  let dynamicInfo: { Icon: typeof MessageCircle; text: string; tone: string } | null = null;
  if (messages > 0) {
    dynamicInfo = {
      Icon: MessageCircle,
      text: `${messages} ${messages === 1 ? "person" : "people"} contacted seller`,
      tone: "text-emerald-300",
    };
  } else if (views >= 25) {
    dynamicInfo = { Icon: TrendingUp, text: `Viewed ${views} times`, tone: "text-foreground/70" };
  } else if (isNewToday) {
    dynamicInfo = { Icon: Sparkles, text: "New today", tone: "text-sky-300" };
  }

  const isTopRanked = index < 3;

  const handleClickTrack = () => {
    track("card_click", {
      dedupeKey: product.id,
      props: { id: product.id, position: index, boosted: isBoostedActive },
    });
    // Fire-and-forget click/view log (trigger increments products.views_count)
    supabase.from("product_views").insert({ product_id: product.id, viewer_id: user?.id ?? null } as any).then(() => {});
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.08, duration: 0.4 }}>
      <Link
        to={`/product/${product.id}`}
        onClick={handleClickTrack}
        data-testid={`product-card-${product.id}`}
        className={`group block glass-card rounded-lg overflow-hidden transition-all duration-300 hover:shadow-gold hover:border-gold ${
          isTopRanked ? "shadow-md ring-1 ring-primary/10" : ""
        }`}
      >
        <div className="aspect-square bg-secondary/50 relative overflow-hidden">
          {images.length > 0 ? (
            <>
              <div
                ref={scrollRef}
                onScroll={handleScroll}
                className="flex w-full h-full overflow-x-auto snap-x snap-mandatory scrollbar-hide"
                style={{ scrollSnapType: "x mandatory" }}
              >
                {images.map((url, i) => (
                  <div key={i} className="w-full h-full flex-shrink-0 snap-center relative">
                    <ThumbImage
                      src={url}
                      alt={`${product.title} ${i + 1}`}
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                ))}
              </div>
              {/* Navigation arrows */}
              {images.length > 1 && (
                <>
                  {activeImg > 0 && (
                    <button
                      onClick={(e) => scrollTo(activeImg - 1, e)}
                      className="absolute left-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                  )}
                  {activeImg < images.length - 1 && (
                    <button
                      onClick={(e) => scrollTo(activeImg + 1, e)}
                      className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded-full bg-background/70 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                  {/* Dots */}
                  <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                    {images.map((_, i) => (
                      <button
                        key={i}
                        onClick={(e) => scrollTo(i, e)}
                        className={`w-1.5 h-1.5 rounded-full transition-all ${i === activeImg ? "bg-primary w-3" : "bg-foreground/40"}`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-secondary/60 to-secondary/20">
              <span className="text-muted-foreground/20 font-display text-2xl uppercase tracking-wider">{product.category}</span>
            </div>
          )}
          <div className="absolute top-3 left-3 z-10">
            <button
              onPointerDown={authCapture.onPointerDown}
              onClick={handleWishlist}
              aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
              aria-pressed={isWished}
              data-testid={`wishlist-toggle-${product.id}`}
              data-state={isWished ? "active" : "inactive"}
              className="p-1.5 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
            >
              <Heart className={`h-4 w-4 transition-colors ${isWished ? "fill-primary text-primary" : "text-foreground/70"}`} />
            </button>
          </div>
          <div className="absolute top-3 right-3 z-10">
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-background/80 backdrop-blur-sm text-foreground/70 capitalize">{product.condition}</span>
          </div>
        </div>
        <div className="p-4 space-y-2">
          {badges.length > 0 && (
            <div className="flex flex-wrap gap-1 -mt-1">
              {badges.slice(0, 3).map((b) => (
                <span
                  key={b.key}
                  data-testid={`badge-${b.key}`}
                  className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full inline-flex items-center gap-1 ${b.className}`}
                >
                  {b.emoji && <span aria-hidden>{b.emoji}</span>}
                  <span>{b.label}</span>
                </span>
              ))}
            </div>
          )}
          <h3 className="font-display text-sm font-semibold leading-tight line-clamp-2 group-hover:text-primary transition-colors">{product.title}</h3>

          {/* Stronger price hierarchy — bigger + tighter */}
          <p className="text-xl font-bold text-primary tracking-tight leading-none">
            {formatPrice(product.price, productCurrency)}
          </p>

          {/* Single dynamic info line (priority: contacts > views > new today) */}
          {dynamicInfo && (
            <div
              data-testid={`dynamic-info-${product.id}`}
              className={`flex items-center gap-1 text-[11px] ${dynamicInfo.tone}`}
            >
              <dynamicInfo.Icon className="h-3 w-3 shrink-0" />
              <span className="truncate">{dynamicInfo.text}</span>
            </div>
          )}

          {/* Location • time ago */}
          {(locationText || timeAgo) && (
            <div className="flex items-center gap-1 text-[11px] text-muted-foreground">
              {locationText && <MapPin className="h-3 w-3 shrink-0" />}
              <span className="truncate">
                {locationText}
                {locationText && timeAgo && <span className="mx-1 opacity-60">•</span>}
                {timeAgo}
              </span>
            </div>
          )}

          {/* Subtle boost note — no flashy styling */}
          {isBoostedActive && (
            <p className="text-[10px] text-muted-foreground/80 italic">Shown more often</p>
          )}
          <div className="flex items-center gap-2 pt-1">
            <div className="w-5 h-5 rounded-full bg-secondary flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
              {product.seller.avatar ? (<img src={product.seller.avatar} alt="" className="w-full h-full object-cover" />) : (product.seller.name.charAt(0))}
            </div>
            <span className="text-xs text-muted-foreground">{product.seller.name}</span>
            <div className="flex items-center gap-0.5 ml-auto">
              <Star className="h-3 w-3 fill-primary text-primary" />
              <span className="text-xs text-muted-foreground">{product.seller.rating}</span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default ProductCard;
