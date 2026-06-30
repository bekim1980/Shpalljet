import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowRight, Calendar, Users, MessageCircle, Zap, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import XhiroHeader from "@/components/xhiro/XhiroHeader";
import XhiroBottomNav from "@/components/xhiro/XhiroBottomNav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRide } from "@/hooks/useRides";
import { useAuth } from "@/hooks/useAuth";
import { useStartConversation } from "@/hooks/useChat";
import { supabase } from "@/integrations/supabase/client";
import { isLeavingSoon, isPopularRoute, seatsBadgeVariant } from "@/lib/rideHelpers";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleString(undefined, {
    weekday: "long",
    day: "2-digit",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });

export default function RideDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { ride, loading } = useRide(id);
  const { user } = useAuth();
  const { startConversation } = useStartConversation();
  const [contacting, setContacting] = useState(false);

  const handleContact = async () => {
    if (!ride) return;
    if (!user) {
      navigate(`/login?redirect=${encodeURIComponent(`/rides/${ride.id}`)}`);
      return;
    }
    if (user.id === ride.user_id) {
      toast.info(t("rides.ownRide", "This is your own ride"));
      return;
    }
    setContacting(true);
    const syntheticProductId = `ride:${ride.id}`;
    const result = await startConversation(syntheticProductId, ride.user_id);
    if (!result) {
      setContacting(false);
      toast.error(t("common.error", "Something went wrong"));
      return;
    }
    if (result.isNew) {
      const intro = t(
        "rides.introMessage",
        `Hi, I'm interested in your ride: ${ride.from_city} → ${ride.to_city} on ${formatDate(ride.departure_time)}.`,
        { from: ride.from_city, to: ride.to_city, when: formatDate(ride.departure_time) },
      );
      await supabase.from("messages").insert({
        conversation_id: result.conversationId,
        sender_id: user.id,
        content: intro,
      });
    }
    setContacting(false);
    navigate(`/messages?conversation=${result.conversationId}`);
  };

  const handleBoost = () => {
    toast.info(t("xhiro.boostSoon", "Boost is coming soon — your ride will appear at the top."));
  };

  const isOwn = user && ride && user.id === ride.user_id;

  return (
    <div className="min-h-screen bg-background pb-32 md:pb-6">
      <XhiroHeader showBack />
      <main className="max-w-md mx-auto px-4 pt-4">
        {loading ? (
          <Skeleton className="h-72 w-full rounded-2xl" />
        ) : !ride ? (
          <div className="rounded-2xl bg-card border border-border p-8 text-center">
            <p className="font-medium">{t("rides.notFound", "Ride not found")}</p>
          </div>
        ) : (
          <>
            {/* Hero card */}
            <div className="rounded-2xl bg-card border border-border p-5">
              <div className="flex flex-wrap gap-1.5 mb-3">
                {isLeavingSoon(ride.departure_time) && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 border border-amber-500/30">
                    ⏰ {t("rides.leavingSoon", "Leaving soon")}
                  </span>
                )}
                {isPopularRoute(ride.from_city, ride.to_city) && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20">
                    🔥 {t("rides.popularRoute", "Popular route")}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <span className="truncate">{ride.from_city}</span>
                <ArrowRight className="h-5 w-5 text-primary shrink-0" />
                <span className="truncate">{ride.to_city}</span>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                {ride.price != null && (
                  <span className="px-3 py-1 rounded-full text-sm font-bold bg-primary text-primary-foreground">
                    €{Number(ride.price).toFixed(0)}
                  </span>
                )}
                {(() => {
                  const s = seatsBadgeVariant(ride.seats_available);
                  return (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                        s.className || "border-border bg-secondary text-muted-foreground"
                      }`}
                    >
                      <Users className="h-3.5 w-3.5" />
                      {ride.seats_available}/{ride.seats_total} {t("rides.seats", "seats")}
                    </span>
                  );
                })()}
              </div>

              <div className="mt-5 space-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{formatDate(ride.departure_time)}</span>
                </div>
                {ride.driver_name && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <UserIcon className="h-4 w-4" />
                    <span>
                      {t("rides.driver", "Driver")}:{" "}
                      <span className="text-foreground font-medium">{ride.driver_name}</span>
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Notes card */}
            {ride.notes && (
              <div className="rounded-2xl bg-card border border-border p-5 mt-3">
                <p className="text-xs font-semibold text-muted-foreground mb-1.5 uppercase tracking-wide">
                  {t("rides.notes", "Notes")}
                </p>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{ride.notes}</p>
              </div>
            )}

            {/* Owner-only Boost (UI only) */}
            {isOwn && (
              <button
                onClick={handleBoost}
                className="w-full mt-3 rounded-2xl border border-dashed border-primary/40 bg-primary/5 hover:bg-primary/10 transition-colors p-4 text-left"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">{t("xhiro.boostTitle", "Boost this ride")}</p>
                    <p className="text-xs text-muted-foreground">
                      {t("xhiro.boostSub", "Appear at the top of the feed")}
                    </p>
                  </div>
                </div>
              </button>
            )}

            {/* Desktop CTA */}
            {!isOwn && (
              <Button
                className="w-full mt-4 h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold hidden md:flex"
                onClick={handleContact}
                disabled={contacting}
              >
                <MessageCircle className="h-5 w-5 mr-2" />
                {user
                  ? t("rides.messageDriver", "Message driver")
                  : t("rides.loginToMessage", "Log in to message driver")}
              </Button>
            )}
          </>
        )}
      </main>

      {/* Sticky bottom CTA (mobile) */}
      {ride && !isOwn && (
        <div className="md:hidden fixed bottom-16 left-0 right-0 z-30 border-t border-border bg-background/95 backdrop-blur-md p-3">
          <div className="max-w-md mx-auto">
            <Button
              className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-semibold"
              onClick={handleContact}
              disabled={contacting}
            >
              <MessageCircle className="h-5 w-5 mr-2" />
              {user
                ? t("rides.messageDriver", "Message driver")
                : t("rides.loginToMessage", "Log in to message driver")}
            </Button>
          </div>
        </div>
      )}

      <XhiroBottomNav />
    </div>
  );
}
