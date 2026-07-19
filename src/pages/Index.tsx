import { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { Search, SlidersHorizontal, X, ArrowUpDown, ShoppingBag, Loader2 } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import ProductCard from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useProducts } from "@/hooks/useProducts";
import { useVertical, type Vertical } from "@/contexts/VerticalContext";
import { useLocale } from "@/contexts/LocaleContext";
import { formatPrice } from "@/lib/currency";
import { VERTICAL_CATEGORIES } from "@/data/verticalConfig";
import SEO from "@/components/SEO";

type SortOption = "newest" | "oldest" | "price-low" | "price-high" | "name-az";

const VALID_VERTICALS: Vertical[] = ["luxe", "market", "rent", "services", "jobs"];

const Index = () => {
  const { vertical, setVertical } = useVertical();
  const [searchParams] = useSearchParams();

  // URL is source of truth on /browse — sync ?vertical=... into context.
  const urlVertical = searchParams.get("vertical");
  useEffect(() => {
    if (urlVertical && (VALID_VERTICALS as string[]).includes(urlVertical) && urlVertical !== vertical) {
      setVertical(urlVertical as Vertical);
    }
  }, [urlVertical, vertical, setVertical]);

  const effectiveVertical: Vertical =
    urlVertical && (VALID_VERTICALS as string[]).includes(urlVertical)
      ? (urlVertical as Vertical)
      : vertical;
  const { t } = useTranslation();
  const { currency } = useLocale();
  const [activeCategory, setActiveCategory] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 1_000_000]);
  const [showFilters, setShowFilters] = useState(false);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [activeSubcategory, setActiveSubcategory] = useState<string | null>(null);

  const { data: dbProducts, isLoading, isError, refetch, isFetching } = useProducts(effectiveVertical);

  // Debounce search input by 350ms
  useEffect(() => {
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(searchQuery), 350);
    return () => clearTimeout(debounceRef.current);
  }, [searchQuery]);

  const verticalCategories = useMemo(() => VERTICAL_CATEGORIES[effectiveVertical] || [], [effectiveVertical]);

  const activeSubcategories = useMemo(() => {
    if (activeCategory === "All") return [];
    const cat = verticalCategories.find(c => c.value === activeCategory);
    return cat?.subcategories || [];
  }, [activeCategory, verticalCategories]);

  const allProducts = useMemo(() => {
    if (dbProducts && dbProducts.length > 0) {
      return dbProducts.map((p) => ({
        id: p.id,
        title: p.title,
        price: Number(p.price),
        image: p.image_urls?.[0] ?? "",
        image_urls: p.image_urls ?? [],
        seller: { name: p.seller?.display_name ?? t("common.unknown"), avatar: p.seller?.avatar_url ?? "", rating: 5.0 },
        category: p.category,
        description: p.description,
        condition: p.condition as "new" | "like-new" | "used",
        currency: (p as any).currency || "EUR",
        country: (p as any).country || null,
        city: (p as any).city || null,
        views_count: (p as any).views_count ?? 0,
        messages_count: (p as any).messages_count ?? 0,
        is_boosted: !!(p as any).is_boosted,
        boost_expires_at: (p as any).boost_expires_at ?? null,
        created_at: (p as any).created_at ?? null,
        price_history: (p as any).price_history ?? null,
      }));
    }
    return [];
  }, [dbProducts, t]);

  const filtered = useMemo(() => {
    const result = allProducts.filter((p) => {
      let matchCategory = activeCategory === "All";
      if (!matchCategory) {
        if (activeSubcategory) {
          matchCategory = p.category.toLowerCase() === activeSubcategory.toLowerCase();
        } else {
          const cat = verticalCategories.find(c => c.value === activeCategory);
          const allValues = [activeCategory, ...(cat?.subcategories?.map(s => s.value) || [])];
          matchCategory = allValues.some(v => p.category.toLowerCase() === v.toLowerCase());
        }
      }
      const matchSearch = !debouncedSearch || p.title.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.category.toLowerCase().includes(debouncedSearch.toLowerCase()) || p.description.toLowerCase().includes(debouncedSearch.toLowerCase());
      const matchPrice = p.price >= priceRange[0] && p.price <= priceRange[1];
      return matchCategory && matchSearch && matchPrice;
    });
    switch (sortBy) {
      case "price-low": result.sort((a, b) => a.price - b.price); break;
      case "price-high": result.sort((a, b) => b.price - a.price); break;
      case "name-az": result.sort((a, b) => a.title.localeCompare(b.title)); break;
      case "oldest": result.reverse(); break;
      default: break;
    }
    return result;
  }, [allProducts, activeCategory, activeSubcategory, debouncedSearch, priceRange, sortBy, verticalCategories]);

  const maxPrice = useMemo(() => Math.max(...allProducts.map((p) => p.price), 1_000_000), [allProducts]);

  // Sync price range upper bound when products load and maxPrice exceeds the current ceiling
  useEffect(() => {
    setPriceRange((prev) => [prev[0], Math.max(prev[1], maxPrice)]);
  }, [maxPrice]);

  const clearFilters = () => { setSearchQuery(""); setDebouncedSearch(""); setActiveCategory("All"); setActiveSubcategory(null); setPriceRange([0, maxPrice]); setShowFilters(false); };
  const hasActiveFilters = searchQuery || activeCategory !== "All" || priceRange[0] > 0 || priceRange[1] < maxPrice;

  const hero = t(`browse.heroTitle.${effectiveVertical}`, { returnObjects: true }) as { title: string; highlight: string; subtitle: string };

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      {/* Ambient depth glows — tint follows active vertical via --primary */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-[480px] overflow-hidden">
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 h-[420px] w-[820px] rounded-full bg-[hsl(var(--primary)/0.10)] blur-[120px]" />
        <div className="absolute top-40 -left-24 h-[280px] w-[280px] rounded-full bg-[hsl(var(--primary)/0.07)] blur-[110px]" />
        <div className="absolute top-64 -right-20 h-[260px] w-[260px] rounded-full bg-[hsl(var(--primary)/0.06)] blur-[110px]" />
      </div>
      <SEO
        title={`${hero.title} ${hero.highlight} — Shpalljet`}
        description={hero.subtitle}
      />
      <Header />
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/[0.06] via-transparent to-transparent" />
        <div className="relative container py-16 md:py-24 text-center space-y-4">
          <motion.h1 key={effectiveVertical} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} className="font-display text-3xl md:text-5xl font-bold leading-tight">
            {hero.title}
            <span className="block text-gradient-gold">{hero.highlight}</span>
          </motion.h1>
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.15 }} className="text-muted-foreground max-w-md mx-auto">{hero.subtitle}</motion.p>
          <div className="max-w-xl mx-auto pt-2">
            <div className="relative flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder={t("browse.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t("browse.searchPlaceholder")}
                  className="pl-9 h-11 bg-secondary/60 border-border/50 focus:border-primary/50"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    aria-label={t("browse.clearSearch", "Clear search")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
              <Button
                variant={showFilters ? "gold" : "gold-outline"}
                size="icon"
                className="h-11 w-11 shrink-0"
                onClick={() => setShowFilters(!showFilters)}
                aria-label={t("browse.filters", "Filters")}
                aria-expanded={showFilters}
              >
                <SlidersHorizontal className="h-4 w-4" />
              </Button>
            </div>
            {showFilters && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="mt-3 glass-card rounded-lg p-4 text-left space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t("browse.priceRange")}</span>
                  <span className="text-sm text-muted-foreground">{formatPrice(priceRange[0], currency)} — {formatPrice(priceRange[1], currency)}</span>
                </div>
                <Slider min={0} max={maxPrice} step={100} value={priceRange} onValueChange={(v) => setPriceRange(v as [number, number])} className="py-2" />
              </motion.div>
            )}
          </div>
        </div>
      </section>

      <section className="container py-6 space-y-3">
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <Button variant={activeCategory === "All" ? "gold" : "ghost"} size="sm" onClick={() => { setActiveCategory("All"); setActiveSubcategory(null); }} className="shrink-0">{t("common.all")}</Button>
          {verticalCategories.map((cat) => (
            <Button key={cat.value} variant={activeCategory === cat.value ? "gold" : "ghost"} size="sm" onClick={() => { setActiveCategory(cat.value); setActiveSubcategory(null); }} className="shrink-0">{cat.label}</Button>
          ))}
        </div>
        {activeSubcategories.length > 0 && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
            <Button variant={!activeSubcategory ? "secondary" : "ghost"} size="sm" onClick={() => setActiveSubcategory(null)} className="shrink-0 text-xs h-7">{t("common.all")}</Button>
            {activeSubcategories.map((sub) => (
              <Button key={sub.value} variant={activeSubcategory === sub.value ? "secondary" : "ghost"} size="sm" onClick={() => setActiveSubcategory(sub.value)} className="shrink-0 text-xs h-7">{sub.label}</Button>
            ))}
          </motion.div>
        )}
      </section>

      <section className="container pb-20">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
          <h2 className="font-display text-xl font-semibold">
            {activeCategory === "All" ? t("browse.allListings") : (activeSubcategory ? activeSubcategories.find(s => s.value === activeSubcategory)?.label : verticalCategories.find(c => c.value === activeCategory)?.label)}
          </h2>
          <div className="flex items-center gap-3">
            {hasActiveFilters && (<button onClick={clearFilters} className="text-xs text-primary hover:underline">{t("browse.clearFilters")}</button>)}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
              <SelectTrigger className="w-[160px] h-8 text-xs bg-secondary/50 border-border/50">
                <ArrowUpDown className="h-3 w-3 mr-1 text-muted-foreground" /><SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">{t("browse.sortNewest")}</SelectItem>
                <SelectItem value="oldest">{t("browse.sortOldest")}</SelectItem>
                <SelectItem value="price-low">{t("browse.sortPriceLow")}</SelectItem>
                <SelectItem value="price-high">{t("browse.sortPriceHigh")}</SelectItem>
                <SelectItem value="name-az">{t("browse.sortAZ")}</SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-muted-foreground">{filtered.length}</span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="glass-card rounded-lg overflow-hidden animate-pulse">
                <div className="aspect-square bg-secondary/50" />
                <div className="p-4 space-y-3"><div className="h-4 bg-secondary/50 rounded w-3/4" /><div className="h-5 bg-secondary/50 rounded w-1/3" /></div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="text-center py-20 space-y-4">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <p className="font-display text-lg text-muted-foreground">
              {t("browse.loadFailed", "Could not load listings.")}
            </p>
            <Button
              type="button"
              variant="gold-outline"
              size="sm"
              disabled={isFetching}
              onClick={() => void refetch()}
              className="gap-2"
            >
              {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {t("common.retry", "Retry")}
            </Button>
          </div>
        ) : filtered.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((product, i) => (<ProductCard key={product.id} product={product} index={i} />))}
          </div>
        ) : allProducts.length === 0 ? (
          <div className="text-center py-24 text-muted-foreground space-y-4">
            <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30" />
            <p className="font-display text-lg">{t("browse.noListings")}</p>
            <Link to="/sell">
              <button className="text-sm text-primary hover:underline mt-1">{t("browse.beFirst", "Be the first to post something")}</button>
            </Link>
          </div>
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p className="font-display text-lg">{t("browse.noResults", "No results match your filters")}</p>
            {hasActiveFilters && (<button onClick={clearFilters} className="text-primary text-sm mt-2 hover:underline">{t("browse.clearFilters")}</button>)}
          </div>
        )}
      </section>

      <footer className="border-t border-border/50 py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <span className="font-display text-gradient-gold font-bold">{t("common.appName")}</span>
          <p>{t("common.copyright")}</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
