import { describe, expect, it, vi } from "vitest";
import { getAuthCallbackUrl, getGoogleAuthCallbackUrl, getSiteUrl } from "@/lib/siteUrl";

describe("siteUrl", () => {
  it("builds auth callback from site URL", () => {
    vi.stubEnv("VITE_SITE_URL", "https://www.shpalljet.net");
    expect(getSiteUrl()).toBe("https://www.shpalljet.net");
    expect(getAuthCallbackUrl()).toBe("https://www.shpalljet.net/auth/callback");
    expect(getGoogleAuthCallbackUrl()).toBe("https://www.shpalljet.net/auth/google-callback");
    vi.unstubAllEnvs();
  });

  it("falls back to window origin in browser when env unset", () => {
    expect(getSiteUrl()).toMatch(/^https?:\/\//);
    expect(getAuthCallbackUrl()).toMatch(/\/auth\/callback$/);
  });
});
