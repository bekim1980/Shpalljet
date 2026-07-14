import { readFileSync } from "fs";
import { describe, expect, it } from "vitest";

describe("auth integration", () => {
  it("Login page does not import Lovable cloud auth", () => {
    const login = readFileSync("src/pages/Login.tsx", "utf8");
    const actions = readFileSync("src/components/auth/useAuthFormActions.ts", "utf8");
    expect(login).not.toMatch(/lovable|~oauth/);
    expect(login).toMatch(/AuthShellContent/);
    expect(actions).toMatch(/oauthAuth/);
  });

  it("no Lovable auth dependency in package.json", () => {
    const pkg = readFileSync("package.json", "utf8");
    expect(pkg).not.toMatch(/lovable|cloud-auth/);
  });

  it("SocialProviders does not render Apple", () => {
    const social = readFileSync("src/components/auth/ui/SocialAuthButtons.tsx", "utf8");
    expect(social).toMatch(/isOAuthProviderEnabled\("apple"\)/);
  });
});
