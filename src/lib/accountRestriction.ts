import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";

export type AccountRestrictionProfile = {
  banned_at: string | null;
  suspended_until: string | null;
};

export type AccountRestrictionKind = "banned" | "suspended";

export type AccountRestriction = {
  kind: AccountRestrictionKind;
  message: string;
  suspendedUntil?: string;
};

export class AccountRestrictedError extends Error {
  readonly restriction: AccountRestriction;

  constructor(restriction: AccountRestriction) {
    super(restriction.message);
    this.name = "AccountRestrictedError";
    this.restriction = restriction;
  }
}

export function isAccountBanned(profile: AccountRestrictionProfile): boolean {
  return !!profile.banned_at;
}

export function isAccountSuspended(
  profile: AccountRestrictionProfile,
  now: Date = new Date(),
): boolean {
  if (!profile.suspended_until) return false;
  return new Date(profile.suspended_until).getTime() > now.getTime();
}

export function formatSuspendedUntil(iso: string): string {
  return format(new Date(iso), "dd/MM/yyyy HH:mm");
}

export function getAccountRestriction(
  profile: AccountRestrictionProfile,
  now: Date = new Date(),
): AccountRestriction | null {
  if (isAccountBanned(profile)) {
    return {
      kind: "banned",
      message:
        "Llogaria juaj është bllokuar. Nuk mund të kryeni këtë veprim. Kontaktoni mbështetjen nëse mendoni se është gabim.",
    };
  }

  if (isAccountSuspended(profile, now)) {
    const until = profile.suspended_until!;
    return {
      kind: "suspended",
      suspendedUntil: until,
      message: `Llogaria juaj është pezulluar deri më ${formatSuspendedUntil(until)}. Nuk mund të kryeni këtë veprim.`,
    };
  }

  return null;
}

export function assertAccountRestriction(
  profile: AccountRestrictionProfile,
  now?: Date,
): void {
  const restriction = getAccountRestriction(profile, now);
  if (restriction) {
    throw new AccountRestrictedError(restriction);
  }
}

export async function fetchAccountRestrictionProfile(
  userId: string,
): Promise<AccountRestrictionProfile | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("banned_at, suspended_until")
    .eq("user_id", userId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

export async function fetchAccountRestriction(
  userId: string,
): Promise<AccountRestriction | null> {
  const profile = await fetchAccountRestrictionProfile(userId);
  if (!profile) return null;
  return getAccountRestriction(profile);
}

/** Fresh profile check before any authenticated write. */
export async function assertAccountCanMutate(userId: string): Promise<void> {
  const profile = await fetchAccountRestrictionProfile(userId);
  if (!profile) return;
  assertAccountRestriction(profile);
}

export function isAccountRestrictedError(error: unknown): error is AccountRestrictedError {
  return error instanceof AccountRestrictedError;
}

export function getMutationErrorMessage(error: unknown, fallback: string): string {
  if (isAccountRestrictedError(error)) return error.message;
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}
