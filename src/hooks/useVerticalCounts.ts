import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

export interface VerticalCounts {
  market: number | null;
  rent: number | null;
  services: number | null;
  jobs: number | null;
  luxe: number | null;
  ridesToday: number | null;
}

const EMPTY: VerticalCounts = {
  market: null,
  rent: null,
  services: null,
  jobs: null,
  luxe: null,
  ridesToday: null,
};

export function useVerticalCounts() {
  const [counts, setCounts] = useState<VerticalCounts>(EMPTY);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const verticals = ["luxe", "market", "rent", "services", "jobs"] as const;
      const results = await Promise.all(
        verticals.map((v) =>
          supabase
            .from("products")
            .select("id", { count: "exact", head: true })
            .eq("status", "active")
            .eq("vertical", v),
        ),
      );

      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(startOfDay);
      endOfDay.setDate(endOfDay.getDate() + 1);

      const ridesRes = await (supabase as any)
        .from("rides")
        .select("id", { count: "exact", head: true })
        .eq("status", "active")
        .gte("departure_time", startOfDay.toISOString())
        .lt("departure_time", endOfDay.toISOString());

      if (cancelled) return;
      setCounts({
        luxe: results[0].count ?? 0,
        market: results[1].count ?? 0,
        rent: results[2].count ?? 0,
        services: results[3].count ?? 0,
        jobs: results[4].count ?? 0,
        ridesToday: ridesRes.count ?? 0,
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return counts;
}
