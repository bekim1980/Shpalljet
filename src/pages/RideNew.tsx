import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import XhiroHeader from "@/components/xhiro/XhiroHeader";
import XhiroBottomNav from "@/components/xhiro/XhiroBottomNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useCreateRide } from "@/hooks/useRides";

export default function RideNew() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { createRide, submitting } = useCreateRide();

  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [departure, setDeparture] = useState("");
  const [price, setPrice] = useState("");
  const [seatsTotal, setSeatsTotal] = useState("3");
  const [seatsAvailable, setSeatsAvailable] = useState("3");
  const [notes, setNotes] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromCity.trim() || !toCity.trim() || !departure) {
      toast.error(t("rides.errorRequired", "From, to and departure are required"));
      return;
    }
    const sTotal = Math.max(1, parseInt(seatsTotal || "1", 10));
    const sAvail = Math.min(sTotal, Math.max(0, parseInt(seatsAvailable || "0", 10)));
    const { data, error } = await createRide({
      from_city: fromCity.trim(),
      to_city: toCity.trim(),
      departure_time: new Date(departure).toISOString(),
      price: price ? Number(price) : null,
      seats_total: sTotal,
      seats_available: sAvail,
      notes: notes.trim() || null,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(t("rides.created", "Ride posted"));
    navigate(`/rides/${data?.id ?? ""}`);
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <XhiroHeader title={t("rides.newTitle", "Post a ride") as string} showBack />
      <main className="max-w-md mx-auto px-4 pt-4">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="rounded-2xl bg-card border border-border p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="from" className="text-xs font-semibold text-muted-foreground">
                  {t("rides.from", "From")}
                </Label>
                <Input
                  id="from"
                  value={fromCity}
                  onChange={(e) => setFromCity(e.target.value)}
                  placeholder="Prishtina"
                  required
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="to" className="text-xs font-semibold text-muted-foreground">
                  {t("rides.to", "To")}
                </Label>
                <Input
                  id="to"
                  value={toCity}
                  onChange={(e) => setToCity(e.target.value)}
                  placeholder="Skopje"
                  required
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dep" className="text-xs font-semibold text-muted-foreground">
                {t("rides.departure", "Departure")}
              </Label>
              <Input
                id="dep"
                type="datetime-local"
                value={departure}
                onChange={(e) => setDeparture(e.target.value)}
                required
                className="mt-1 h-11 rounded-xl"
              />
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="price" className="text-xs font-semibold text-muted-foreground">
                  {t("rides.price", "Price (€)")}
                </Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.5"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="st" className="text-xs font-semibold text-muted-foreground">
                  {t("rides.seatsTotal", "Seats")}
                </Label>
                <Input
                  id="st"
                  type="number"
                  min="1"
                  value={seatsTotal}
                  onChange={(e) => setSeatsTotal(e.target.value)}
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="sa" className="text-xs font-semibold text-muted-foreground">
                  {t("rides.seatsAvail", "Available")}
                </Label>
                <Input
                  id="sa"
                  type="number"
                  min="0"
                  value={seatsAvailable}
                  onChange={(e) => setSeatsAvailable(e.target.value)}
                  className="mt-1 h-11 rounded-xl"
                />
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card border border-border p-4">
            <Label htmlFor="notes" className="text-xs font-semibold text-muted-foreground">
              {t("rides.notes", "Notes")}
            </Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder={t("rides.notesPlaceholder", "Pickup point, luggage, etc.") as string}
              className="mt-1 rounded-xl"
            />
          </div>

          <Button
            type="submit"
            disabled={submitting}
            className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground text-base font-semibold"
          >
            {submitting ? t("common.saving", "Saving...") : t("rides.publish", "Publish ride")}
          </Button>
        </form>
      </main>
      <XhiroBottomNav />
    </div>
  );
}
