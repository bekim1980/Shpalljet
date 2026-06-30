import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export const useCreateReport = () => {
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      reportedType,
      reportedId,
      reason,
      description,
    }: {
      reportedType: "product" | "user";
      reportedId: string;
      reason: string;
      description: string;
    }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("reports").insert({
        reporter_id: user.id,
        reported_type: reportedType,
        reported_id: reportedId,
        reason,
        description,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Raporti u dërgua me sukses. Faleminderit!");
    },
    onError: () => {
      toast.error("Dështoi dërgimi i raportit");
    },
  });
};
