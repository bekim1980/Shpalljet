import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useLocale } from "@/contexts/LocaleContext";
import { formatPrice, COUNTRIES } from "@/lib/currency";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { useSearchProducts } from "@/hooks/useSearch";
import { useCategories } from "@/hooks/useCategories";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, SearchX, Search, SlidersHorizontal, X, Sparkles, ArrowUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AISearchBar, { type ParsedFilters } from "@/components/ai/AISearchBar";
import { ENABLE_AI_ASSISTANT } from "@/config/features";
import { Badge } from "@/components/ui/badge";
import { Bell, BellOff, Check } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useFindSavedSearch, useCreateSavedSearch, useToggleSavedSearch } from "@/hooks/useSavedSearches";
import { toast } from "sonner";
import { useEffect } from "react";
import { track } from "@/lib/analytics";

const TRENDING_SUGGESTIONS = ["iPhone", "Apartment Tirana", "Rolex", "Office desk", "Bicycle"];

type SortOption = "newest" | "oldest" | "price-low" | "price-high" | "relevance";

const SearchResults = () => {
  const [params] = useSearchParams();
  const initialQuery = params.get("q") ?? "";
  const { t } = useTranslation();
  const { currency } = useLocale();

  const [query, setQuery] = useState(initialQuery);
  const [categoryId, setCategoryId] = useState<string>("");
  const [condition, setCondition] = useState<string>("");
  const [location, setLocation] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100000]);
  const [sortBy, setSortBy] = useState<SortOption>("relevance");
  const [showFilters, setShowFilters] = useState(false);
  const [aiInterpretation, setAiInterpretation] = useState<string>("");
  const [aiOriginalQuery, setAiOriginalQuery] = useState<string>("");
  const [showBackToTop, setShowBackToTop] = useState(false);

  const { data: categories } = useCategories();
  const { user } = useAuth();

  // Show back-to-top after scrolling 600px
  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 600);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const scrollToTop = () => {
    track("back_to_top", { dedupeKey: "session" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const filters = useMemo(() => ({
    query, categoryId: categoryId || undefined, condition: condition || undefined,
    location: location || undefined, priceMin: priceRange[0] > 0 ? priceRange[0] : undefined,
    priceMax: priceRange[1] < 100000 ? priceRange[1] : undefined, sortBy,
  }), [query, categoryId, condition, location, priceRange, sortBy]);

  const { data: results, isLoading } = useSearchProducts(filters);

  // Saved search controls
  const savedFilters = {
    query, category_id: categoryId || null, condition: condition || null,
    location: location || null,
    price_min: priceRange[0] > 0 ? priceRange[0] : null,
    price_max: priceRange[1] < 100000 ? priceRange[1] : null,
    sort_by: sortBy,
  };
  const existingSaved = useFindSavedSearch(savedFilters);
  const createSaved = useCreateSavedSearch();
  const toggleSaved = useToggleSavedSearch();

  const canSave = !!user && (query.trim().length >= 2 || !!categoryId || !!condition || !!location || priceRange[0] > 0 || priceRange[1] < 100000);

  const handleSaveSearch = async () => {
    if (!user) { toast.error(t("search.loginToSave") || "Please log in to save searches"); return; }
    try {
      await createSaved.mutateAsync(savedFilters);
      toast.success(t("search.savedNotify") || "Saved • We'll notify you about new matches");
    } catch (e: any) {
      if (String(e?.message ?? "").includes("duplicate")) {
        toast.info(t("search.alreadySaved") || "This search is already saved");
      } else {
        toast.error(t("common.error") || "Something went wrong");
      }
    }
  };

  const handleUnsubscribe = async () => {
    if (!existingSaved) return;
    await toggleSaved.mutateAsync({ id: existingSaved.id, is_active: false });
    toast.success(t("search.unsubscribed") || "Unsubscribed from this search");
  };

  // Fallback: if AI-filtered search yields 0 results, retry keyword-only
  const hasAiFilters = !!(condition || location || priceRange[0] > 0 || priceRange[1] < 100000);
  const fallbackEnabled = !!aiInterpretation && !isLoading && results?.length === 0 && hasAiFilters;
  const { data: fallbackResults } = useSearchProducts(
    fallbackEnabled ? { query, sortBy: "relevance" } : { query: "" }
  );
  const finalResults = (results && results.length > 0) ? results : (fallbackEnabled ? fallbackResults : results);
  const usedFallback = fallbackEnabled && (fallbackResults?.length ?? 0) > 0;

  const hasActiveFilters = !!(categoryId || condition || location || priceRange[0] > 0 || priceRange[1] < 100000);
  const clearFilters = () => { setCategoryId(""); setCondition(""); setLocation(""); setPriceRange([0, 100000]); };
  const clearAi = () => { setAiInterpretation(""); setAiOriginalQuery(""); clearFilters(); };

  const mapProduct = (p: any) => ({
    id: p.id, title: p.title, price: Number(p.price), image: p.image_urls?.[0] ?? "",
    image_urls: p.image_urls ?? [],
    seller: { name: p.seller?.display_name ?? t("common.unknown"), avatar: p.seller?.avatar_url ?? "", rating: 5.0 },
    category: p.category, description: p.description, condition: p.condition as "new" | "like-new" | "used",
    currency: p.currency || "EUR", country: p.country || null, city: p.city || null,
    views_count: p.views_count ?? 0, messages_count: p.messages_count ?? 0,
    is_boosted: !!p.is_boosted, boost_expires_at: p.boost_expires_at ?? null,
    created_at: p.created_at ?? null, price_history: p.price_history ?? null,
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="container py-8">
        <div className="max-w-2xl mx-auto mb-6 space-y-3">
          {ENABLE_AI_ASSISTANT && <AISearchBar
            defaultQuery={initialQuery}
            onParsed={(f: ParsedFilters, raw?: string) => {
              setQuery(f.cleaned_query || query);
              if (f.condition) setCondition(f.condition);
              if (f.location) setLocation(f.location);
              if (typeof f.price_max === "number") setPriceRange(([min]) => [min, Math.max(f.price_max!, min)]);
              if (typeof f.price_min === "number") setPriceRange(([, max]) => [f.price_min!, max]);
              if (f.sort_by === "newest" || f.sort_by === "price-low" || f.sort_by === "price-high" || f.sort_by === "relevance") {
                setSortBy(f.sort_by);
              }
              if (raw) setAiOriginalQuery(raw);
              setAiInterpretation(f.explanation || f.cleaned_query || raw || "");
            }}
          />}
          <AnimatePresence>
            {aiInterpretation && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 flex items-start gap-2"
              >
                <Sparkles className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {t("search.aiInterpretedPrefix")}{" "}
                    <span className="text-foreground font-medium">{aiOriginalQuery || aiInterpretation}</span>
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    {(priceRange[0] > 0 || priceRange[1] < 100000) && (
                      <Badge variant="secondary" className="gap-1 text-[11px]">
                        {formatPrice(priceRange[0], currency)}–{formatPrice(priceRange[1], currency)}
                        <button onClick={() => setPriceRange([0, 100000])} aria-label="clear price"><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {condition && (
                      <Badge variant="secondary" className="gap-1 text-[11px]">
                        {condition}
                        <button onClick={() => setCondition("")} aria-label="clear condition"><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                    {location && (
                      <Badge variant="secondary" className="gap-1 text-[11px]">
                        📍 {location}
                        <button onClick={() => setLocation("")} aria-label="clear location"><X className="h-3 w-3" /></button>
                      </Badge>
                    )}
                  </div>
                </div>
                <button onClick={clearAi} className="text-muted-foreground hover:text-foreground" aria-label="dismiss">
                  <X className="h-4 w-4" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder={t("search.searchPlaceholder")} value={query} onChange={(e) => setQuery(e.target.value)} className="pl-9 h-11 bg-secondary/60 border-border/50" />
              {query && (<button onClick={() => setQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="h-4 w-4" /></button>)}
            </div>
            <Button variant={showFilters ? "gold" : "gold-outline"} size="icon" className="h-11 w-11 shrink-0" onClick={() => setShowFilters(!showFilters)}><SlidersHorizontal className="h-4 w-4" /></Button>
          </div>
          {showFilters && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 glass-card rounded-lg p-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t("search.category")}</label>
                  <Select value={categoryId} onValueChange={setCategoryId}>
                    <SelectTrigger className="bg-secondary/50 h-9 text-sm"><SelectValue placeholder={t("search.allCategories")} /></SelectTrigger>
                    <SelectContent><SelectItem value="">{t("search.allCategories")}</SelectItem>{categories?.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t("search.condition")}</label>
                  <Select value={condition} onValueChange={setCondition}>
                    <SelectTrigger className="bg-secondary/50 h-9 text-sm"><SelectValue placeholder={t("search.allConditions")} /></SelectTrigger>
                    <SelectContent><SelectItem value="">{t("search.allConditions")}</SelectItem><SelectItem value="new">{t("search.conditionNew")}</SelectItem><SelectItem value="like-new">{t("search.conditionLikeNew")}</SelectItem><SelectItem value="good">{t("search.conditionGood")}</SelectItem><SelectItem value="used">{t("search.conditionUsed")}</SelectItem></SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">{t("search.location")}</label>
                  <Input placeholder={t("search.locationPlaceholder")} value={location} onChange={(e) => setLocation(e.target.value)} className="bg-secondary/50 h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between"><span className="text-xs font-medium text-muted-foreground">{t("search.priceRange")}</span><span className="text-xs text-muted-foreground">{formatPrice(priceRange[0], currency)} — {formatPrice(priceRange[1], currency)}</span></div>
                <Slider min={0} max={100000} step={100} value={priceRange} onValueChange={(v) => setPriceRange(v as [number, number])} className="py-2" />
              </div>
              {hasActiveFilters && (<button onClick={clearFilters} className="text-xs text-primary hover:underline">{t("search.clearFilters")}</button>)}
            </motion.div>
          )}
        </div>
        {/* Sticky filter / sort bar — keeps controls reachable while scrolling */}
        <div className="sticky top-14 z-30 -mx-4 sm:mx-0 px-4 sm:px-0 mb-5 bg-background/85 backdrop-blur-md supports-[backdrop-filter]:bg-background/70 border-b border-border/40 py-3 flex items-center justify-between">
          <h1 className="font-display text-base sm:text-xl font-bold truncate pr-2">{query ? t("search.resultsFor", { query }) : t("search.title")}</h1>
          <div className="flex items-center gap-3 shrink-0">
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[130px] h-8 text-xs bg-secondary/50 border-border/50"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="relevance">{t("search.relevance")}</SelectItem>
                <SelectItem value="newest">{t("browse.sortNewest")}</SelectItem>
                <SelectItem value="oldest">{t("browse.sortOldest")}</SelectItem>
                <SelectItem value="price-low">{t("browse.sortPriceLow")}</SelectItem>
                <SelectItem value="price-high">{t("browse.sortPriceHigh")}</SelectItem>
              </SelectContent>
            </Select>
            <span className="hidden sm:inline text-sm text-muted-foreground">{finalResults ? `${finalResults.length} ${t("search.results")}` : ""}</span>
          </div>
        </div>
        {canSave && (
          <div className="mb-4 flex items-center justify-between gap-3 rounded-lg border border-primary/20 bg-primary/5 px-3 py-2">
            {existingSaved && existingSaved.is_active ? (
              <>
                <div className="flex items-center gap-2 text-sm">
                  <Check className="h-4 w-4 text-primary shrink-0" />
                  <span className="text-foreground">{t("search.savedNotify") || "Saved • We'll notify you about new matches"}</span>
                </div>
                <Button variant="ghost" size="sm" onClick={handleUnsubscribe} disabled={toggleSaved.isPending} className="gap-1.5 text-xs">
                  <BellOff className="h-3.5 w-3.5" />
                  {t("search.unsubscribe") || "Unsubscribe"}
                </Button>
              </>
            ) : (
              <>
                <p className="text-xs text-muted-foreground">
                  {t("search.saveSearchHint") || "Get notified when new listings match these filters."}
                </p>
                <Button variant="gold-outline" size="sm" onClick={handleSaveSearch} disabled={createSaved.isPending} className="gap-1.5 text-xs">
                  <Bell className="h-3.5 w-3.5" />
                  {existingSaved ? (t("search.resubscribe") || "Re-subscribe") : (t("search.saveSearch") || "Save search")}
                </Button>
              </>
            )}
          </div>
        )}
        {usedFallback && (
          <p className="text-xs text-muted-foreground mb-3 text-center">{t("search.fallbackUsed")}</p>
        )}
        {isLoading && (<div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>)}
        {!isLoading && finalResults && finalResults.length === 0 && (
          <div className="text-center py-16 space-y-4">
            <SearchX className="h-12 w-12 mx-auto text-muted-foreground/40" />
            <div>
              <p className="font-display text-base font-semibold">{t("search.noResults")}</p>
              <p className="text-xs text-muted-foreground mt-1">{t("search.tryBroader", "Try a broader search or one of these:")}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2 max-w-md mx-auto">
              {TRENDING_SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => { setQuery(s); clearFilters(); }}
                  className="text-xs px-3 py-1.5 rounded-full border border-border/60 bg-secondary/40 text-foreground/80 hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {s}
                </button>
              ))}
            </div>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="text-primary text-xs hover:underline">{t("search.clearFilters")}</button>
            )}
          </div>
        )}
        {!isLoading && query.length < 2 && !hasActiveFilters && (<div className="text-center py-20"><Search className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" /><p className="text-muted-foreground">{t("search.minChars")}</p></div>)}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{finalResults?.map((p, i) => (<ProductCard key={p.id} product={mapProduct(p)} index={i} />))}</div>
      </div>

      {/* Back-to-top FAB */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            type="button"
            onClick={scrollToTop}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            aria-label={t("search.backToTop", "Back to top")}
            className="fixed bottom-6 right-6 z-40 h-11 w-11 rounded-full bg-primary text-primary-foreground shadow-lg flex items-center justify-center hover:opacity-90 transition-opacity"
          >
            <ArrowUp className="h-5 w-5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SearchResults;
