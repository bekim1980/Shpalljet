import { describe, expect, it, vi } from "vitest";
import { enabledOAuthProviders, isOAuthProviderEnabled } from "@/config/authProviders";

describe("authProviders", () => {
  it("disables providers by default until env flags are set", () => {
    expect(isOAuthProviderEnabled("google")).toBe(false);
    expect(isOAuthProviderEnabled("apple")).toBe(false);
    expect(enabledOAuthProviders()).toEqual([]);
  });

  it("enables google when VITE_OAUTH_GOOGLE_ENABLED is true", () => {
    vi.stubEnv("VITE_OAUTH_GOOGLE_ENABLED", "true");
    expect(isOAuthProviderEnabled("google")).toBe(true);
    expect(enabledOAuthProviders()).toContain("google");
    vi.unstubAllEnvs();
  });
});
