import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import {
  listingVisibilityAuditAction,
  listingVisibilityStatus,
} from "@/lib/adminListingVisibility";
import { toast } from "sonner";

export const useIsAdmin = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["is-admin", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user!.id)
        .eq("role", "admin")
        .maybeSingle();
      if (error) return false;
      return !!data;
    },
  });
};

export const useAdminProducts = () => {
  return useQuery({
    queryKey: ["admin-products"],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useAdminProfiles = () => {
  return useQuery({
    queryKey: ["admin-profiles"],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useAdminReports = () => {
  return useQuery({
    queryKey: ["admin-reports"],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from("reports")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useAdminPendingListings = () => {
  return useQuery({
    queryKey: ["admin-pending"],
    queryFn: async (): Promise<any[]> => {
      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("moderation_status", "pending")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useAuditLogs = (filters?: { action?: string; targetType?: string }) => {
  return useQuery({
    queryKey: ["audit-logs", filters],
    queryFn: async (): Promise<any[]> => {
      let query = supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (filters?.action) query = query.eq("action", filters.action);
      if (filters?.targetType) query = query.eq("target_type", filters.targetType);

      const { data, error } = await query;
      if (error) throw error;

      // Fetch admin display names
      const adminIds = [...new Set((data ?? []).map((l: any) => l.admin_id))];
      if (adminIds.length > 0) {
        const { data: profiles } = await supabase
          .from("profiles")
          .select("user_id, display_name")
          .in("user_id", adminIds);
        const profileMap = new Map(profiles?.map((p) => [p.user_id, p.display_name]) ?? []);
        return (data ?? []).map((l: any) => ({ ...l, admin_name: profileMap.get(l.admin_id) ?? "Admin" }));
      }

      return data ?? [];
    },
  });
};

// Helper to insert audit log
const insertAuditLog = async (adminId: string, action: string, targetType: string, targetId: string, metadata?: Record<string, any>) => {
  await supabase.from("audit_logs").insert({
    admin_id: adminId,
    action,
    target_type: targetType,
    target_id: targetId,
    metadata: metadata ?? {},
  });
};

export const useDeleteProduct = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("products").delete().eq("id", id);
      if (error) throw error;
      if (user) await insertAuditLog(user.id, "delete_listing", "product", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Listimi u fshi");
    },
    onError: () => toast.error("Gabim gjatë fshirjes"),
  });
};

export const useSetListingVisibility = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, visible }: { id: string; visible: boolean }) => {
      const status = listingVisibilityStatus(visible);
      const { error } = await supabase.from("products").update({ status }).eq("id", id);
      if (error) throw error;
      if (user) {
        await insertAuditLog(user.id, listingVisibilityAuditAction(visible), "product", id);
      }
    },
    onSuccess: (_data, { visible }) => {
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success(visible ? "Listimi u shfaq përsëri" : "Listimi u fsheh");
    },
    onError: () => toast.error("Gabim gjatë përditësimit të listimit"),
  });
};

export const useModerateProduct = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: Record<string, string> = { moderation_status: status };
      if (status === "approved") updates.status = "active";
      if (status === "rejected") updates.status = "inactive";
      const { error } = await supabase.from("products").update(updates).eq("id", id);
      if (error) throw error;
      const action = status === "approved" ? "approve_listing" : "reject_listing";
      if (user) await insertAuditLog(user.id, action, "product", id);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-pending"] });
      qc.invalidateQueries({ queryKey: ["admin-products"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Statusi u përditësua");
    },
    onError: () => toast.error("Gabim"),
  });
};

export const useBanUser = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ userId, action }: { userId: string; action: "ban" | "unban" | "suspend" }) => {
      let updates: Record<string, string | null> = {};
      if (action === "ban") updates = { banned_at: new Date().toISOString() };
      if (action === "unban") updates = { banned_at: null, suspended_until: null };
      if (action === "suspend") {
        const until = new Date();
        until.setDate(until.getDate() + 7);
        updates = { suspended_until: until.toISOString() };
      }
      const { error } = await supabase.from("profiles").update(updates).eq("user_id", userId);
      if (error) throw error;
      const auditAction = action === "ban" ? "suspend_user" : action === "unban" ? "restore_user" : "suspend_user";
      if (user) await insertAuditLog(user.id, auditAction, "user", userId, { action });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-profiles"] });
      qc.invalidateQueries({ queryKey: ["audit-logs"] });
      toast.success("Statusi i përdoruesit u përditësua");
    },
    onError: () => toast.error("Gabim"),
  });
};

export const useUpdateReportStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("reports").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-reports"] });
      toast.success("Raporti u përditësua");
    },
    onError: () => toast.error("Gabim"),
  });
};
