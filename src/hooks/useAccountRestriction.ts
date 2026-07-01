import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchAccountRestrictionProfile,
  getAccountRestriction,
  type AccountRestriction,
} from "@/lib/accountRestriction";

export const accountRestrictionQueryKey = (userId: string) =>
  ["account-restriction", userId] as const;

export const useAccountRestriction = () => {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: accountRestrictionQueryKey(user?.id ?? ""),
    enabled: !!user,
    queryFn: async (): Promise<AccountRestriction | null> => {
      const profile = await fetchAccountRestrictionProfile(user!.id);
      if (!profile) return null;
      return getAccountRestriction(profile);
    },
    staleTime: 30_000,
  });

  return {
    ...query,
    restriction: query.data ?? null,
    isRestricted: !!query.data,
    message: query.data?.message ?? null,
  };
};
