import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export interface Ride {
  id: string;
  user_id: string;
  from_city: string;
  to_city: string;
  departure_time: string;
  price: number | null;
  seats_total: number;
  seats_available: number;
  notes: string | null;
  status: string;
  created_at: string;
  updated_at: string;
  driver_name?: string | null;
}

export function useRides() {
  const [rides, setRides] = useState<Ride[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRides = useCallback(async () => {
    const nowIso = new Date().toISOString();
    const { data, error } = await (supabase as any)
      .from("rides")
      .select("*")
      .eq("status", "active")
      .gte("departure_time", nowIso)
      .order("departure_time", { ascending: true });

    if (error) {
      console.error("Error fetching rides:", error);
      setLoading(false);
      return;
    }

    const list = (data || []) as Ride[];
    // enrich with driver names
    const ids = Array.from(new Set(list.map((r) => r.user_id)));
    if (ids.length) {
      const { data: profiles } = await supabase
        .from("profiles")
        .select("user_id, display_name")
        .in("user_id", ids);
      const map = new Map((profiles || []).map((p: any) => [p.user_id, p.display_name]));
      list.forEach((r) => (r.driver_name = map.get(r.user_id) ?? null));
    }
    setRides(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchRides();
    const channel = supabase
      .channel("rides-feed")
      .on("postgres_changes", { event: "*", schema: "public", table: "rides" }, () => {
        fetchRides();
      })
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchRides]);

  return { rides, loading, refetch: fetchRides };
}

export function useRide(id: string | undefined) {
  const [ride, setRide] = useState<Ride | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    (async () => {
      const { data, error } = await (supabase as any).from("rides").select("*").eq("id", id).maybeSingle();
      if (error) console.error(error);
      if (data) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", data.user_id)
          .maybeSingle();
        setRide({ ...data, driver_name: profile?.display_name ?? null });
      }
      setLoading(false);
    })();
  }, [id]);

  return { ride, loading };
}

export interface CreateRideInput {
  from_city: string;
  to_city: string;
  departure_time: string;
  price: number | null;
  seats_total: number;
  seats_available: number;
  notes?: string | null;
}

export function useCreateRide() {
  const { user } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const createRide = async (input: CreateRideInput) => {
    if (!user) return { error: new Error("Not authenticated") };
    setSubmitting(true);
    const { data, error } = await (supabase as any)
      .from("rides")
      .insert({ ...input, user_id: user.id })
      .select("id")
      .single();
    setSubmitting(false);
    return { data, error };
  };

  return { createRide, submitting };
}
