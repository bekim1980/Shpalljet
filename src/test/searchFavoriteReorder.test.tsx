/**
 * Integration test: favoriting a product re-ranks search results
 * without a full page refresh.
 *
 * We mock the Supabase client so:
 *   - rank_products returns [A, B] on the first call
 *   - rank_products returns [B, A] on subsequent calls (engagement boost)
 *   - wishlist insert/delete succeed
 *
 * Then we render SearchResults, click product B's heart, and assert
 * the rendered card order flips, proving the ranked search query was
 * invalidated and re-fetched in place.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";

// ----- Hoisted state for the mocked Supabase client -----
const state = vi.hoisted(() => ({
  rpcCalls: 0 as number,
  wishlist: new Set<string>(),
  user: { id: "user-1" },
}));

// ----- Mock @/integrations/supabase/client -----
vi.mock("@/integrations/supabase/client", () => {
  const productA = {
    id: "prod-a", seller_id: "seller-1", title: "Alpha Watch", description: "",
    price: 100, category: "watches", condition: "new", image_urls: [],
    status: "active", vertical: "luxe", created_at: new Date().toISOString(),
    currency: "EUR", country: null, city: null, contact_method: "chat",
    listing_type: "free", is_boosted: false, boost_expires_at: null,
    expires_at: null, auto_renew: false, views_count: 0, messages_count: 0,
    favorites_count: 0, quality_score: 50, final_score: 0.5,
  };
  const productB = { ...productA, id: "prod-b", title: "Bravo Bag", category: "bags" };

  const rpc = vi.fn((name: string) => {
    if (name === "rank_products") {
      state.rpcCalls += 1;
      // First call: A then B. After toggle: B then A.
      const data = state.rpcCalls === 1 ? [productA, productB] : [productB, productA];
      return Promise.resolve({ data, error: null });
    }
    return Promise.resolve({ data: [], error: null });
  });

  const profilesSelect = () => ({
    in: () => Promise.resolve({ data: [{ user_id: "seller-1", display_name: "Seller", avatar_url: "" }], error: null }),
    eq: () => ({ single: () => Promise.resolve({ data: null, error: null }) }),
  });

  const wishlistChain = () => ({
    select: () => ({
      eq: () => Promise.resolve({
        data: Array.from(state.wishlist).map((product_id) => ({ product_id })),
        error: null,
      }),
    }),
    insert: (row: { product_id: string }) => {
      state.wishlist.add(row.product_id);
      return Promise.resolve({ data: null, error: null });
    },
    delete: () => ({
      eq: () => ({
        eq: (_col: string, value: string) => {
          state.wishlist.delete(value);
          return Promise.resolve({ data: null, error: null });
        },
      }),
    }),
  });

  const supabase = {
    auth: { getUser: () => Promise.resolve({ data: { user: state.user } }) },
    rpc,
    from: (table: string) => {
      if (table === "wishlist") return wishlistChain();
      if (table === "profiles") return { select: profilesSelect };
      if (table === "search_events") return { insert: () => Promise.resolve({ data: null, error: null }) };
      if (table === "product_views") return { insert: () => ({ then: (cb: any) => cb({ data: null, error: null }) }) };
      return { select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }) };
    },
  };
  return { supabase };
});

// ----- Mock useAuth so toggle is allowed -----
vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: state.user, loading: false }),
}));

// ----- Stub heavy children that aren't relevant -----
vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/ai/AISearchBar", () => ({ default: () => null }));
vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ currency: "EUR", country: "AL", language: "en" }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (k: string, opts?: any) => (opts?.query ? `${k}:${opts.query}` : k) }),
}));

import SearchResults from "@/pages/SearchResults";

const renderPage = () => {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/search?q=alpha"]}>
        <SearchResults />
      </MemoryRouter>
    </QueryClientProvider>,
  );
};

beforeEach(() => {
  state.rpcCalls = 0;
  state.wishlist.clear();
});

describe("Search reorders after favorite toggle (no reload)", () => {
  it("re-fetches ranked results, flips order, and toggles heart UI state on each click", async () => {
    const { container } = renderPage();

    // Initial ranked order: Alpha, then Bravo
    await waitFor(() => {
      expect(screen.getByText("Alpha Watch")).toBeInTheDocument();
      expect(screen.getByText("Bravo Bag")).toBeInTheDocument();
    });

    const initialTitles = Array.from(container.querySelectorAll("h3")).map((n) => n.textContent);
    expect(initialTitles.indexOf("Alpha Watch")).toBeLessThan(initialTitles.indexOf("Bravo Bag"));
    expect(state.rpcCalls).toBe(1);

    // ---- BEFORE FIRST CLICK: heart must be inactive ----
    const heart = () => screen.getByTestId("wishlist-toggle-prod-b");
    expect(heart()).toHaveAttribute("aria-pressed", "false");
    expect(heart()).toHaveAttribute("data-state", "inactive");
    expect(state.wishlist.has("prod-b")).toBe(false);

    // ---- FIRST CLICK: favorite ----
    fireEvent.click(heart());

    // Mocked wishlist state updated
    await waitFor(() => expect(state.wishlist.has("prod-b")).toBe(true));

    // Heart UI reflects active state after refetch
    await waitFor(() => {
      expect(heart()).toHaveAttribute("aria-pressed", "true");
      expect(heart()).toHaveAttribute("data-state", "active");
    });

    // Ranked search re-fetched and order flipped
    await waitFor(() => {
      const titles = Array.from(container.querySelectorAll("h3")).map((n) => n.textContent);
      expect(titles.indexOf("Bravo Bag")).toBeLessThan(titles.indexOf("Alpha Watch"));
    });
    expect(state.rpcCalls).toBeGreaterThanOrEqual(2);

    // Heart still active after the rank refetch settles
    expect(heart()).toHaveAttribute("aria-pressed", "true");
    expect(heart()).toHaveAttribute("data-state", "active");

    // ---- SECOND CLICK: unfavorite ----
    fireEvent.click(heart());

    await waitFor(() => expect(state.wishlist.has("prod-b")).toBe(false));

    await waitFor(() => {
      expect(heart()).toHaveAttribute("aria-pressed", "false");
      expect(heart()).toHaveAttribute("data-state", "inactive");
    });

    // Heart remains inactive after the next ranked refetch
    const callsAfter = state.rpcCalls;
    await waitFor(() => expect(state.rpcCalls).toBeGreaterThanOrEqual(callsAfter));
    expect(heart()).toHaveAttribute("aria-pressed", "false");
    expect(heart()).toHaveAttribute("data-state", "inactive");
  });
});
