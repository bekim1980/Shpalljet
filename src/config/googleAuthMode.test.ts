import { describe, expect, it, vi } from "vitest";
import { getGoogleAuthMode, isNextAuthGoogleMode } from "@/config/googleAuthMode";

describe("googleAuthMode", () => {
  it("defaults to supabase for rollback", () => {
    expect(getGoogleAuthMode()).toBe("supabase");
    expect(isNextAuthGoogleMode()).toBe(false);
  });

  it("uses nextauth when VITE_GOOGLE_AUTH_MODE=nextauth", () => {
    vi.stubEnv("VITE_GOOGLE_AUTH_MODE", "nextauth");
    expect(getGoogleAuthMode()).toBe("nextauth");
    expect(isNextAuthGoogleMode()).toBe(true);
    vi.unstubAllEnvs();
  });
});
