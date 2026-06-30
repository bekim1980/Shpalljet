import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Calendar, Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import XhiroHeader from "@/components/xhiro/XhiroHeader";
import XhiroBottomNav from "@/components/xhiro/XhiroBottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import type { Ride } from "@/hooks/useRides";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function MyRides() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent("/my-rides")}`);
      return;
    }
    (async () => {
      const { data, error } = await (supabase as any)
        .from("rides")
        .select("*")
        .eq("user_id", user.id)
        .order("departure_time", { ascending: false });
      if (error) {
        toast.error(error.message);
      } else {
        setRides((data || []) as Ride[]);
      }
      setLoading(false);
    })();
  }, [user, navigate]);

  const handleDelete = async (id: string) => {
    if (!confirm(t("xhiro.confirmDelete", "Delete this ride?") as string)) return;
    const { error } = await (supabase as any).from("rides").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setRides((prev) => prev.filter((r) => r.id !== id));
    toast.success(t("xhiro.deleted", "Ride deleted"));
  };

  const now = Date.now();

  return (
    <div className="min-h-screen bg-background pb-24">
      <XhiroHeader title={t("xhiro.myRides", "My rides") as string} />
      <main className="max-w-md mx-auto px-4 pt-4">
        <div className="flex items-center justify-between mb-4">
          <p className="text-sm text-muted-foreground">
            {t("xhiro.myRidesSub", "All trips you’ve posted.")}
          </p>
          <Button asChild size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
            <Link to="/rides/new">
              <Plus className="h-4 w-4 mr-1" />
              {t("rides.post", "Post ride")}
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-28 w-full rounded-2xl" />
            ))}
          </div>
        ) : rides.length === 0 ? (
          <div className="rounded-2xl bg-card border border-border p-10 text-center">
            <p className="font-semibold">{t("xhiro.noMyRides", "You haven’t posted any rides yet.")}</p>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              {t("xhiro.noMyRidesSub", "Share your next trip and offer seats.")}
            </p>
            <Button asChild className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Link to="/rides/new">
                <Plus className="h-4 w-4 mr-1" />
                {t("rides.post", "Post ride")}
              </Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {rides.map((r) => {
              const past = new Date(r.departure_time).getTime() < now;
              return (
                <div key={r.id} className="rounded-2xl bg-card border border-border p-4">
                  <Link to={`/rides/${r.id}`} className="block">
                    <div className="flex items-center gap-2 text-lg font-bold tracking-tight">
                      <span className="truncate">{r.from_city}</span>
                      <ArrowRight className="h-4 w-4 text-primary shrink-0" />
                      <span className="truncate">{r.to_city}</span>
                      {past && (
                        <span className="ml-auto text-[10px] font-semibold uppercase text-muted-foreground bg-secondary px-2 py-0.5 rounded-full">
                          {t("xhiro.past", "Past")}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        {formatDate(r.departure_time)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Users className="h-3.5 w-3.5" />
                        {r.seats_available}/{r.seats_total}
                      </span>
                      {r.price != null && <span>· €{Number(r.price).toFixed(0)}</span>}
                    </div>
                  </Link>
                  <button
                    onClick={() => handleDelete(r.id)}
                    className="mt-3 text-xs font-semibold text-destructive inline-flex items-center gap-1 hover:underline"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    {t("common.delete", "Delete")}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>
      <XhiroBottomNav />
    </div>
  );
}
