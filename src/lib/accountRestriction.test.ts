import { describe, expect, it } from "vitest";
import {
  AccountRestrictedError,
  assertAccountRestriction,
  getAccountRestriction,
  isAccountBanned,
  isAccountSuspended,
} from "./accountRestriction";

describe("accountRestriction", () => {
  const now = new Date("2026-06-30T12:00:00.000Z");

  it("detects banned accounts", () => {
    const profile = { banned_at: "2026-06-01T00:00:00.000Z", suspended_until: null };
    expect(isAccountBanned(profile)).toBe(true);
    expect(isAccountSuspended(profile, now)).toBe(false);
  });

  it("detects active suspension", () => {
    const profile = {
      banned_at: null,
      suspended_until: "2026-07-01T00:00:00.000Z",
    };
    expect(isAccountSuspended(profile, now)).toBe(true);
  });

  it("ignores expired suspension", () => {
    const profile = {
      banned_at: null,
      suspended_until: "2026-06-01T00:00:00.000Z",
    };
    expect(isAccountSuspended(profile, now)).toBe(false);
    expect(getAccountRestriction(profile, now)).toBeNull();
  });

  it("prioritizes ban over suspension", () => {
    const profile = {
      banned_at: "2026-06-01T00:00:00.000Z",
      suspended_until: "2026-07-01T00:00:00.000Z",
    };
    const restriction = getAccountRestriction(profile, now);
    expect(restriction?.kind).toBe("banned");
  });

  it("returns Albanian suspension message with formatted date", () => {
    const profile = {
      banned_at: null,
      suspended_until: "2026-07-01T18:30:00.000Z",
    };
    const restriction = getAccountRestriction(profile, now);
    expect(restriction?.kind).toBe("suspended");
    expect(restriction?.message).toContain("pezulluar");
    expect(restriction?.message).toContain("01/07/2026");
  });

  it("throws AccountRestrictedError when restricted", () => {
    expect(() =>
      assertAccountRestriction(
        { banned_at: "2026-06-01T00:00:00.000Z", suspended_until: null },
        now,
      ),
    ).toThrow(AccountRestrictedError);
  });

  it("allows unrestricted accounts", () => {
    expect(() =>
      assertAccountRestriction({ banned_at: null, suspended_until: null }, now),
    ).not.toThrow();
  });
});
