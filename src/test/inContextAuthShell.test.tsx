import { readFileSync } from "fs";
import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { buildCurrentPath } from "@/lib/authReturnPath";

const openAuthShell = vi.fn();
const toggleWishlist = vi.fn();

vi.mock("@/contexts/AuthShellProvider", () => ({
  useAuthShell: () => ({ openAuthShell, closeAuthShell: vi.fn() }),
  AuthShellProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

vi.mock("@/hooks/useWishlist", () => ({
  useWishlist: () => ({ data: new Set<string>() }),
  useToggleWishlist: () => ({ mutate: toggleWishlist }),
}));

vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ currency: "EUR", country: "AL", language: "en" }),
}));

vi.mock("@/lib/analytics", () => ({ track: vi.fn() }));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: () => ({ insert: () => ({ then: () => {} }) }) },
}));

vi.mock("@/hooks/useChat", () => ({
  useStartConversation: () => ({ startConversation: vi.fn() }),
}));

vi.mock("@/hooks/useReports", () => ({
  useCreateReport: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue ?? key,
  }),
}));

import { useAuth } from "@/hooks/useAuth";
import ProductCard from "@/components/ProductCard";

const sampleProduct = {
  id: "prod-1",
  title: "Test Watch",
  price: 100,
  image: "",
  seller: { name: "Seller", avatar: "", rating: 5 },
  category: "watches",
  description: "Desc",
  condition: "new",
};

const renderProductCard = (path = "/search?q=test#results") =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <ProductCard product={sampleProduct} index={0} />
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof useAuth>);
  Object.defineProperty(window, "scrollY", { value: 420, configurable: true });
});

describe("buildCurrentPath", () => {
  it("includes pathname, search, and hash", () => {
    expect(
      buildCurrentPath({
        pathname: "/p/test-slug",
        search: "?ref=home",
        hash: "#gallery",
        state: null,
        key: "k",
      }),
    ).toBe("/p/test-slug?ref=home#gallery");
  });
});

describe("in-context auth shell wiring (source)", () => {
  it("ProductCard uses auth shell instead of /login for wishlist", () => {
    const source = readFileSync("src/components/ProductCard.tsx", "utf8");
    expect(source).toMatch(/useRequireAuthShell/);
    expect(source).not.toMatch(/navigate\(["']\/login/);
  });

  it("ProductDetail uses auth shell for guarded seller actions", () => {
    const source = readFileSync("src/pages/ProductDetail.tsx", "utf8");
    expect(source).toMatch(/useRequireAuthShell/);
    expect(source).not.toMatch(/navigate\(["']\/login/);
  });

  it("MakeOfferDialog closes dialog and uses auth shell on submit when logged out", () => {
    const source = readFileSync("src/components/product/MakeOfferDialog.tsx", "utf8");
    expect(source).toMatch(/useRequireAuthShell/);
    expect(source).toMatch(/onBeforeAuth:\s*\(\)\s*=>\s*setOpen\(false\)/);
    expect(source).not.toMatch(/navigate\(["']\/login/);
  });

  it("ReportDialog closes dialog and uses auth shell on submit when logged out", () => {
    const source = readFileSync("src/components/ReportDialog.tsx", "utf8");
    expect(source).toMatch(/useRequireAuthShell/);
    expect(source).toMatch(/onBeforeAuth:\s*\(\)\s*=>\s*setOpen\(false\)/);
    expect(source).not.toMatch(/navigate\(["']\/login/);
  });

  it("ProtectedRoute still redirects to /login", () => {
    const source = readFileSync("src/components/ProtectedRoute.tsx", "utf8");
    expect(source).toMatch(/Navigate to="\/login"/);
  });

  it("Header Post Listing stays on /sell (ProtectedRoute)", () => {
    const source = readFileSync("src/components/Header.tsx", "utf8");
    const sellLinks = source.match(/<Link to="\/sell">[\s\S]*?<\/Link>/g) ?? [];
    expect(sellLinks.length).toBeGreaterThanOrEqual(1);
    sellLinks.forEach((block) => {
      expect(block).not.toMatch(/openAuthShell/);
    });
  });

  it("Apple remains absent from SocialProviders", () => {
    const social = readFileSync("src/components/auth/ui/SocialAuthButtons.tsx", "utf8");
    expect(social).toMatch(/isOAuthProviderEnabled\("apple"\)/);
  });

  it("Facebook remains hidden until backend ships", () => {
    const providers = readFileSync("src/config/authProviders.ts", "utf8");
    expect(providers).toMatch(/FACEBOOK_AUTH_IMPLEMENTED = false/);
    const social = readFileSync("src/components/auth/ui/SocialAuthButtons.tsx", "utf8");
    expect(social).toMatch(/isFacebookButtonVisible/);
  });
});

describe("ProductCard wishlist auth shell", () => {
  it("opens auth shell when logged out", () => {
    renderProductCard("/browse?sort=price#top");

    const heart = screen.getByTestId("wishlist-toggle-prod-1");
    fireEvent.pointerDown(heart);
    fireEvent.click(heart);

    expect(openAuthShell).toHaveBeenCalledTimes(1);
    expect(openAuthShell).toHaveBeenCalledWith(
      expect.objectContaining({
        returnTo: "/browse?sort=price#top",
        scrollY: 420,
        trigger: expect.any(HTMLElement),
      }),
    );
    expect(toggleWishlist).not.toHaveBeenCalled();
  });

  it("still toggles wishlist when logged in", async () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" },
      loading: false,
    } as ReturnType<typeof useAuth>);

    renderProductCard();

    fireEvent.click(screen.getByTestId("wishlist-toggle-prod-1"));

    await waitFor(() => {
      expect(toggleWishlist).toHaveBeenCalledWith({ productId: "prod-1", isWished: false });
    });
    expect(openAuthShell).not.toHaveBeenCalled();
  });
});

describe("ProductDetail guarded actions (source)", () => {
  it("routes wishlist, message, contact, WhatsApp, and Viber through requireAuth", () => {
    const source = readFileSync("src/pages/ProductDetail.tsx", "utf8");
    expect(source).toMatch(/const handleWishlist/);
    expect(source).toMatch(/const handleMessage/);
    expect(source).toMatch(/const handleContact/);
    expect(source).toMatch(/const handleWhatsApp/);
    expect(source).toMatch(/const handleViber/);
    expect(source.match(/requireAuth\(/g)?.length).toBeGreaterThanOrEqual(5);
  });
});

describe("nested dialog auth shell (source)", () => {
  it("MakeOfferDialog and ReportDialog close before opening auth shell", () => {
    const offer = readFileSync("src/components/product/MakeOfferDialog.tsx", "utf8");
    const report = readFileSync("src/components/ReportDialog.tsx", "utf8");
    expect(offer).toMatch(/onBeforeAuth:\s*\(\)\s*=>\s*setOpen\(false\)/);
    expect(report).toMatch(/onBeforeAuth:\s*\(\)\s*=>\s*setOpen\(false\)/);
  });
});

describe("MakeOfferDialog submit auth shell", () => {
  it("opens auth shell when logged out on submit", async () => {
    const MakeOfferDialog = (await import("@/components/product/MakeOfferDialog")).default;

    render(
      <MemoryRouter initialEntries={["/product/prod-1?tab=offer"]}>
        <MakeOfferDialog
          productId="prod-1"
          productTitle="Test"
          askingPrice={100}
          currency="EUR"
          sellerId="seller-1"
        />
      </MemoryRouter>,
    );

    fireEvent.click(screen.getByRole("button", { name: /product.makeOffer/i }));
    fireEvent.change(screen.getByLabelText(/product.yourOffer/i), { target: { value: "80" } });
    fireEvent.click(screen.getByRole("button", { name: /product.sendOffer/i }));

    await waitFor(() => {
      expect(openAuthShell).toHaveBeenCalledWith(
        expect.objectContaining({
          returnTo: "/product/prod-1?tab=offer",
          trigger: expect.any(HTMLElement),
        }),
      );
    });
  });
});

describe("ReportDialog submit auth shell", () => {
  it("uses requireAuth with dialog close before opening auth shell", () => {
    const source = readFileSync("src/components/ReportDialog.tsx", "utf8");
    expect(source).toMatch(/requireAuth\(\(\) => \{\}/);
    expect(source).toMatch(/onBeforeAuth:\s*\(\)\s*=>\s*setOpen\(false\)/);
  });
});
