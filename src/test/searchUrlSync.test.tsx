/**
 * SearchResults URL ↔ filter state sync (init, replace updates, invalid values).
 * Infinite-scroll regression covered in searchInfiniteScroll.test.tsx.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";

const state = vi.hoisted(() => ({
  rpcCalls: [] as { name: string; args: Record<string, unknown> }[],
  locationSearch: "",
}));

function makeProduct(id: string, title: string) {
  return {
    id,
    seller_id: "seller-1",
    title,
    description: "",
    price: 100,
    category: "watches",
    condition: "new",
    image_urls: [],
    status: "active",
    vertical: "luxe",
    created_at: new Date().toISOString(),
    currency: "EUR",
    country: null,
    city: null,
    contact_method: "chat",
    listing_type: "free",
    is_boosted: false,
    boost_expires_at: null,
    expires_at: null,
    auto_renew: false,
    views_count: 0,
    messages_count: 0,
    favorites_count: 0,
    quality_score: 50,
    final_score: 0.5,
  };
}

vi.mock("@/integrations/supabase/client", () => {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
    state.rpcCalls.push({ name, args });
    if (name === "rank_products" || name === "search_products") {
      return {
        data: [makeProduct("p-1", "Synced Item")],
        error: null,
      };
    }
    return { data: [], error: null };
  });

  return {
    supabase: {
      auth: { getUser: () => Promise.resolve({ data: { user: null } }) },
      rpc,
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              in: () =>
                Promise.resolve({
                  data: [{ user_id: "seller-1", display_name: "Seller", avatar_url: "" }],
                  error: null,
                }),
            }),
          };
        }
        if (table === "categories") {
          return {
            select: () => ({
              order: () =>
                Promise.resolve({
                  data: [
                    {
                      id: "cat-uuid-1",
                      name: "Phones",
                      slug: "phones",
                      parent_id: null,
                      created_at: "",
                    },
                  ],
                  error: null,
                }),
            }),
          };
        }
        if (table === "search_events") {
          return { insert: () => Promise.resolve({ data: null, error: null }) };
        }
        if (table === "wishlist") {
          return {
            select: () => ({
              eq: () => Promise.resolve({ data: [], error: null }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: [], error: null }),
            order: () => Promise.resolve({ data: [], error: null }),
          }),
        };
      },
    },
  };
});

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

vi.mock("@/hooks/useRequireAuthShell", () => ({
  useRequireAuthShell: () => ({
    user: null,
    requireAuth: () => false,
  }),
  useAuthShellTriggerCapture: () => ({
    onPointerDown: vi.fn(),
    pointerOptions: () => ({ scrollY: 0, trigger: null }),
  }),
  captureAuthShellContext: vi.fn(),
}));

vi.mock("@/components/Header", () => ({ default: () => null }));
vi.mock("@/components/ai/AISearchBar", () => ({ default: () => null }));
vi.mock("@/contexts/LocaleContext", () => ({
  useLocale: () => ({ currency: "EUR", country: "AL", language: "en" }),
}));
vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (k: string, opts?: string | Record<string, unknown>) => {
      if (typeof opts === "string") return opts;
      if (opts && typeof opts === "object" && "query" in opts) {
        return `${k}:${String(opts.query)}`;
      }
      return k;
    },
  }),
}));

import SearchResults from "@/pages/SearchResults";

function LocationCapture() {
  const location = useLocation();
  useEffect(() => {
    state.locationSearch = location.search;
  }, [location.search]);
  return null;
}

function renderSearch(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <LocationCapture />
        <Routes>
          <Route path="/search" element={<SearchResults />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  state.rpcCalls = [];
  state.locationSearch = "";
  class MockIntersectionObserver {
    observe = vi.fn();
    unobserve = vi.fn();
    disconnect = vi.fn();
    takeRecords = () => [];
    root = null;
    rootMargin = "";
    thresholds = [];
  }
  vi.stubGlobal("IntersectionObserver", MockIntersectionObserver);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("SearchResults URL synchronization", () => {
  it("initializes filters from URL and runs categoryId search", async () => {
    renderSearch("/search?categoryId=cat-uuid-1&utm_source=share");

    await waitFor(() => {
      expect(screen.getByText("Synced Item")).toBeInTheDocument();
    });

    const rank = state.rpcCalls.find((c) => c.name === "rank_products");
    expect(rank?.args.filter_category_id).toBe("cat-uuid-1");
    expect(state.locationSearch).toContain("categoryId=cat-uuid-1");
    expect(state.locationSearch).toContain("utm_source=share");
  });

  it("updates the URL with replace when the query changes", async () => {
    renderSearch("/search?q=alpha&ref=keep");

    await waitFor(() => {
      expect(screen.getByText("Synced Item")).toBeInTheDocument();
    });

    const input = screen.getByPlaceholderText("search.searchPlaceholder");
    await act(async () => {
      fireEvent.change(input, { target: { value: "beta phones" } });
    });

    await waitFor(() => {
      expect(state.locationSearch).toContain("q=beta+phones");
    });
    expect(state.locationSearch).toContain("ref=keep");
    expect(state.locationSearch).not.toContain("q=alpha");
  });

  it("ignores invalid condition and sortBy from the URL", async () => {
    renderSearch("/search?q=watch&condition=mint&sortBy=popular&priceMin=abc");

    await waitFor(() => {
      expect(screen.getByText("Synced Item")).toBeInTheDocument();
    });

    await waitFor(() => {
      const params = new URLSearchParams(state.locationSearch);
      expect(params.get("q")).toBe("watch");
      expect(params.get("condition")).toBeNull();
      expect(params.get("sortBy")).toBeNull();
      expect(params.get("priceMin")).toBeNull();
    });

    const rank = state.rpcCalls.find((c) => c.name === "rank_products");
    expect(rank?.args.filter_condition).toBeNull();
  });

  it("initializes from location-only URL and runs the search", async () => {
    renderSearch("/search?location=Prishtin%C3%AB");

    await waitFor(() => {
      expect(screen.getByText("Synced Item")).toBeInTheDocument();
    });

    const rank = state.rpcCalls.find((c) => c.name === "rank_products");
    expect(rank).toBeTruthy();
    expect(rank?.args.filter_location).toBe("Prishtinë");
    expect(state.locationSearch).toContain("location=Prishtin");
  });
});
