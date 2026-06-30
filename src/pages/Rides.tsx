import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Calendar, Users, Plus, MapPin, X, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import XhiroHeader from "@/components/xhiro/XhiroHeader";
import XhiroBottomNav from "@/components/xhiro/XhiroBottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRides } from "@/hooks/useRides";
import { useTranslation } from "react-i18next";
import { isLeavingSoon, isPopularRoute, timeAgo, seatsBadgeVariant } from "@/lib/rideHelpers";

type RouteFilter = { from: string; to: string };

const QUICK_ROUTES: RouteFilter[] = [
  { from: "Prishtina", to: "Skopje" },
  { from: "Prishtina", to: "Tirana" },
  { from: "Prishtina", to: "Prizren" },
];

const cityMatch = (value: string, target: string) => {
  const v = value.toLowerCase().trim();
  const t = target.toLowerCase().trim();
  const aliases: Record<string, string[]> = {
    prishtina: ["prishtina", "prishtinë", "pristina"],
    skopje: ["skopje", "shkup"],
    tirana: ["tirana", "tiranë"],
    prizren: ["prizren", "prizreni"],
  };
  const list = aliases[t] ?? [t];
  return list.some((a) => v.includes(a));
};

const isToday = (iso: string) => {
  const d = new Date(iso);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
};

const formatTime = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function Rides() {
  const { rides, loading } = useRides();
  const { t } = useTranslation();
  const [routeFilter, setRouteFilter] = useState<RouteFilter | null>(null);
  const [todayOnly, setTodayOnly] = useState(false);

  const filtered = useMemo(() => {
    return rides.filter((r) => {
      if (routeFilter && !(cityMatch(r.from_city, routeFilter.from) && cityMatch(r.to_city, routeFilter.to))) return false;
      if (todayOnly && !isToday(r.departure_time)) return false;
      return true;
    });
  }, [rides, routeFilter, todayOnly]);

  const hasActiveFilter = routeFilter !== null || todayOnly;
  const isRouteActive = (r: RouteFilter) => routeFilter?.from === r.from && routeFilter?.to === r.to;

  return (
    <div className="min-h-screen bg-background pb-20 md:pb-6">
      <XhiroHeader />
      <main className="max-w-md mx-auto px-4 pt-4">
        {/* Title */}
        <div className="mb-4">
          <h1 className="font-display text-3xl font-bold leading-tight">
            {t("xhiro.feedTitle", "Find a ride")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("xhiro.feedSubtitle", "Intercity trips, posted by drivers like you.")}
          </p>
        </div>

        {/* Quick filter chips */}
        <div className="flex gap-2 overflow-x-auto pb-3 -mx-4 px-4 scrollbar-hide">
          <button
            onClick={() => setTodayOnly((v) => !v)}
            className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors ${
              todayOnly
                ? "bg-primary text-primary-foreground border-primary"
                : "bg-card text-foreground border-border hover:border-primary/50"
            }`}
          >
            {t("rides.filterToday", "Today")}
          </button>
          {QUICK_ROUTES.map((r) => {
            const active = isRouteActive(r);
            return (
              <button
                key={`${r.from}-${r.to}`}
                onClick={() => setRouteFilter(active ? null : r)}
                className={`shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-foreground border-border hover:border-primary/50"
                }`}
              >
                {r.from} → {r.to}
              </button>
            );
          })}
          {hasActiveFilter && (
            <button
              onClick={() => {
                setRouteFilter(null);
                setTodayOnly(false);
              }}
              className="shrink-0 px-3 py-2 rounded-full text-xs font-medium border border-border bg-card text-muted-foreground hover:text-foreground inline-flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              {t("common.clear", "Clear")}
            </button>
          )}
        </div>

        {/* List */}
        {loading ? (
          <div className="space-y-3 mt-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-32 w-full rounded-2xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-10 text-center mt-2">
            <MapPin className="h-10 w-10 mx-auto text-muted-foreground mb-3" />
            <p className="font-semibold">
              {hasActiveFilter
                ? t("rides.noMatch", "No rides match these filters.")
                : t("rides.emptyTitle", "No rides yet.")}
            </p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {hasActiveFilter
                ? t("rides.tryClear", "Try clearing filters or post a new trip.")
                : t("rides.emptySubtitle", "Be the first to post a trip.")}
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/rides/new">
                <Plus className="h-4 w-4 mr-1" />
                {t("rides.post", "Post ride")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3 mt-2">
            {filtered.map((r, i) => {
              const soon = isLeavingSoon(r.departure_time);
              const popular = isPopularRoute(r.from_city, r.to_city);
              const seats = seatsBadgeVariant(r.seats_available);
              return (
                <motion.div
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <Link to={`/rides/${r.id}`} className="block">
                    <div className="rounded-2xl bg-card border border-border p-4 hover:border-primary/40 transition-colors">
                      {(soon || popular) && (
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {soon && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                              ⏰ {t("rides.leavingSoon", "Leaving soon")}
                            </span>
                          )}
                          {popular && (
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                              <Sparkles className="h-3 w-3 mr-0.5" />
                              {t("rides.popularRoute", "Popular route")}
                            </span>
                          )}
                        </div>
                      )}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 text-xl font-bold tracking-tight">
                            <span className="truncate">{r.from_city}</span>
                            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                            <span className="truncate">{r.to_city}</span>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-2 text-xs text-muted-foreground">
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              {formatTime(r.departure_time)}
                            </span>
                            {r.driver_name && <span>· {r.driver_name}</span>}
                            <span>· {timeAgo(r.created_at)}</span>
                          </div>
                          {r.notes && (
                            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{r.notes}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end gap-1.5 shrink-0">
                          {r.price != null && (
                            <span className="px-2.5 py-1 rounded-full text-sm font-bold bg-secondary text-foreground">
                              €{Number(r.price).toFixed(0)}
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                              seats.className || "border-border bg-secondary text-muted-foreground"
                            }`}
                          >
                            <Users className="h-3 w-3" />
                            {r.seats_available} {seats.label}
                          </span>
                        </div>
                      </div>
                      <Button
                        className="w-full mt-3 h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl"
                        tabIndex={-1}
                      >
                        {t("rides.messageDriver", "Message driver")}
                      </Button>
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        )}
      </main>
      <XhiroBottomNav />
    </div>
  );
}
