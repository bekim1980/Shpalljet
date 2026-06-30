import { describe, expect, it } from "vitest";
import { readFileSync } from "fs";

describe("InstallBanner", () => {
  it("is mounted globally in App and uses native prompt CTA", () => {
    const app = readFileSync("src/App.tsx", "utf8");
    expect(app).toMatch(/InstallBanner/);
    const banner = readFileSync("src/components/install/InstallBanner.tsx", "utf8");
    expect(banner).toMatch(/runInstallPrompt|install\(\)/);
    expect(banner).toMatch(/data-testid="install-banner"/);
  });
});
