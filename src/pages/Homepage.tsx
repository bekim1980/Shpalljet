import { useState } from "react";
import { motion } from "framer-motion";
import { Crown, Store, Home, Briefcase, BriefcaseBusiness, ArrowRight, Search, Car } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import Header from "@/components/Header";
import TrendingSection from "@/components/TrendingSection";
import { useVertical, type Vertical } from "@/contexts/VerticalContext";
import { useVerticalCounts } from "@/hooks/useVerticalCounts";
import SEO from "@/components/SEO";
import { SITE_URL } from "@/lib/seoImage";

const verticalIcons: Record<Vertical, { icon: React.ElementType; gradient: string; iconBg: string }> = {
  luxe: { icon: Crown, gradient: "from-amber-800 via-amber-900/85 to-stone-900", iconBg: "bg-amber-400/20 text-amber-300" },
  market: { icon: Store, gradient: "from-blue-800 via-blue-900/85 to-slate-900", iconBg: "bg-blue-400/20 text-blue-300" },
  rent: { icon: Home, gradient: "from-emerald-800 via-emerald-900/85 to-gray-900", iconBg: "bg-emerald-400/20 text-emerald-300" },
  services: { icon: Briefcase, gradient: "from-violet-800 via-purple-900/85 to-gray-900", iconBg: "bg-violet-400/20 text-violet-300" },
  jobs: { icon: BriefcaseBusiness, gradient: "from-rose-800 via-rose-900/85 to-gray-900", iconBg: "bg-rose-400/20 text-rose-300" },
};

const verticalKeys: Vertical[] = ["luxe", "market", "rent", "services", "jobs"];

const Homepage = () => {
  const { setVertical } = useVertical();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { t } = useTranslation();
  const counts = useVerticalCounts();

  const statLabel = (v: Vertical): string | null => {
    const n = counts[v];
    if (n == null) return null;
    switch (v) {
      case "market": return `${n} ${t("homepage.stats.listings", "listings")}`;
      case "rent": return `${n} ${t("homepage.stats.homes", "homes")}`;
      case "services": return `${n} ${t("homepage.stats.providers", "providers")}`;
      case "jobs": return `${n} ${t("homepage.stats.openings", "openings")}`;
      case "luxe": return `${n} ${t("homepage.stats.items", "items")}`;
      default: return null;
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim().length >= 2) {
      navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <SEO
        title="Shpalljet — Marketplace për Shqipëri, Kosovë, Maqedoni & Diasporë"
        description="Bli, shit, jep me qira dhe gjej shërbime, punë e udhëtime në një marketplace modern për shqiptarët kudo."
        canonical={`${SITE_URL}/`}
      />
      <Header />

      {/* Hero */}
      <section className="relative overflow-hidden flex-1 flex flex-col">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(42_65%_55%/0.14),_transparent_45%),linear-gradient(180deg,_hsl(0_0%_6%)_0%,_hsl(220_28%_10%)_55%,_hsl(0_0%_4%)_100%)]" />
          <div className="absolute top-10 left-1/2 -translate-x-1/2 w-[520px] h-[360px] bg-[hsl(42,65%,55%/0.12)] rounded-full blur-[130px]" />
          <div className="absolute top-72 -left-24 w-72 h-72 bg-[hsl(220,70%,50%/0.08)] rounded-full blur-[110px]" />
          <div className="absolute top-96 -right-20 w-72 h-72 bg-[hsl(260,60%,55%/0.07)] rounded-full blur-[110px]" />
          <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noise\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noise)\' opacity=\'0.5\'/%3E%3C/svg%3E")' }} />
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[hsl(42,65%,55%/0.2)] to-transparent" />

        <div className="relative container flex-1 flex flex-col justify-center py-12 md:py-20">
          <div className="text-center space-y-4 mb-8 md:mb-10">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="tracking-[0.3em] uppercase text-muted-foreground font-medium"
            >
              <span className="text-4xl md:text-6xl font-display font-bold text-gradient-gold tracking-wide">{t("homepage.brandName")}</span>
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="font-display text-3xl md:text-5xl font-bold leading-tight"
            >
              {t("homepage.title")}
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-muted-foreground text-sm md:text-base max-w-md mx-auto"
            >
              {t("homepage.subtitle")}
            </motion.p>

            <motion.form
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              onSubmit={handleSearch}
              className="max-w-lg mx-auto mt-2"
            >
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                <input
                  type="text"
                  placeholder={t("homepage.searchPlaceholder")}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-12 pl-12 pr-4 rounded-full bg-card/60 backdrop-blur-md border border-border/50 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50 transition-all text-sm"
                />
                {searchQuery.trim().length >= 2 && (
                  <button
                    type="submit"
                    className="absolute right-2 top-1/2 -translate-y-1/2 h-8 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold hover:bg-primary/90 transition-colors"
                  >
                    {t("homepage.searchButton")}
                  </button>
                )}
              </div>
            </motion.form>

            <motion.div
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="mt-4 flex justify-center"
            >
              <Link
                to="/sell"
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-primary/90 text-primary-foreground font-display font-semibold text-sm md:text-base shadow-md shadow-primary/15 hover:bg-primary hover:shadow-lg hover:shadow-primary/25 hover:scale-[1.03] transition-all duration-300"
              >
                <span className="text-base">+</span>
                {t("homepage.postAd", "Posto shpallje")}
              </Link>
            </motion.div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5 max-w-5xl mx-auto w-full">
            {/* Standard verticals */}
            {verticalKeys.map((v, i) => {
              const cfg = verticalIcons[v];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={v}
                  initial={{ opacity: 0, y: 25 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.35 + i * 0.06, duration: 0.4 }}
                  className="h-full"
                >
                  <Link
                    to={`/browse?vertical=${v}`}
                    onClick={() => setVertical(v)}
                    className={`relative h-full min-h-[160px] md:min-h-[180px] overflow-hidden rounded-2xl bg-gradient-to-br ${cfg.gradient} p-4 md:p-5 flex flex-col justify-between group transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-black/30 border border-white/[0.06]`}
                  >
                    <div className="absolute inset-0 bg-white/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                    <div className={`relative w-11 h-11 md:w-12 md:h-12 rounded-xl ${cfg.iconBg} flex items-center justify-center`}>
                      <Icon className="h-5 w-5 md:h-6 md:w-6" />
                    </div>
                    <div className="relative mt-3">
                      <h3 className="font-display text-base md:text-lg font-bold text-white tracking-wide leading-tight">
                        {t(`homepage.verticals.${v}.label`)}
                      </h3>
                      <p className="text-xs md:text-sm text-white/75 mt-1 line-clamp-2">
                        {t(`homepage.verticals.${v}.tagline`)}
                      </p>
                      {statLabel(v) && (
                        <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] md:text-xs font-semibold text-white/70">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          {statLabel(v)}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 md:h-5 md:w-5 text-white/20 group-hover:text-white/60 group-hover:translate-x-1 transition-all duration-300" />
                  </Link>
                </motion.div>
              );
            })}

            {/* Rides – standalone vertical with its own table */}
            <motion.div
              initial={{ opacity: 0, y: 25 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 + verticalKeys.length * 0.06, duration: 0.4 }}
              className="h-full"
            >
              <Link
                to="/rides"
                className="relative h-full min-h-[160px] md:min-h-[180px] overflow-hidden rounded-2xl bg-gradient-to-br from-sky-700 via-sky-800/90 to-slate-900 p-4 md:p-5 flex flex-col justify-between group transition-all duration-300 hover:scale-[1.03] hover:shadow-2xl hover:shadow-sky-500/20 border border-sky-300/20 ring-1 ring-sky-400/10"
              >
                <span className="absolute top-3 right-3 z-10 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-primary text-primary-foreground shadow-md shadow-primary/30">
                  🔥 {t("homepage.new", "New")}
                </span>
                <div className="absolute inset-0 bg-white/[0.04] opacity-0 group-hover:opacity-100 transition-opacity duration-300 rounded-2xl" />
                <div className="relative w-11 h-11 md:w-12 md:h-12 rounded-xl bg-sky-300/20 text-sky-100 flex items-center justify-center">
                  <Car className="h-5 w-5 md:h-6 md:w-6" />
                </div>
                <div className="relative mt-3">
                  <h3 className="font-display text-base md:text-lg font-bold text-white tracking-wide leading-tight">
                    {t("homepage.verticals.rides.label", "RIDES / UDHËTIME")}
                  </h3>
                  <p className="text-xs md:text-sm text-white/70 mt-1 line-clamp-2">
                    {t("homepage.verticals.rides.tagline", "Intercity rides shared by drivers")}
                  </p>
                  {counts.ridesToday != null && (
                    <p className="mt-1.5 inline-flex items-center gap-1 text-[10px] md:text-xs font-semibold text-white/85">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      {counts.ridesToday} {t("homepage.stats.ridesToday", "rides today")}
                    </p>
                  )}
                </div>
                <ArrowRight className="absolute bottom-4 right-4 h-4 w-4 md:h-5 md:w-5 text-white/40 group-hover:text-white group-hover:translate-x-1 transition-all duration-300" />
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      <TrendingSection />

      <footer className="border-t border-border/50 py-6">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-3 text-xs text-muted-foreground">
          <span className="font-display text-gradient-gold font-bold text-sm">{t("homepage.brandName")}</span>
          <div className="flex items-center gap-4">
            <Link to="/install" className="hover:text-foreground transition-colors">{t("homepage.installApp")}</Link>
            <p>{t("common.copyright")}</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Homepage;
