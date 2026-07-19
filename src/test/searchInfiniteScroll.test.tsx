/**
 * Infinite scroll on SearchResults: sentinel intersection loads the next
 * offset once; repeated callbacks while in-flight do not duplicate requests.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { SEARCH_PAGE_SIZE } from "@/hooks/useSearch";

const state = vi.hoisted(() => ({
  rpcCalls: [] as { name: string; args: Record<string, unknown> }[],
  observerCallback: null as IntersectionObserverCallback | null,
  observe: vi.fn(),
  disconnect: vi.fn(),
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
    if (name !== "rank_products" && name !== "search_products") {
      return { data: [], error: null };
    }
    const offset = Number(args.result_offset ?? 0);
    if (offset === 0) {
      const data = Array.from({ length: SEARCH_PAGE_SIZE }, (_, i) =>
        makeProduct(`p-${i}`, `Item ${i}`),
      );
      return { data, error: null };
    }
    if (offset === SEARCH_PAGE_SIZE) {
      return {
        data: [makeProduct("p-next", "Next Page Item")],
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
  state.rpcCalls = [];
  state.observerCallback = null;
  state.observe.mockClear();
  state.disconnect.mockClear();

  class MockIntersectionObserver {
    constructor(cb: IntersectionObserverCallback) {
      state.observerCallback = cb;
    }
    observe = state.observe;
    unobserve = vi.fn();
    disconnect = state.disconnect;
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

describe("SearchResults infinite scrolling", () => {
  it("loads the first page, then loads the next page once when the sentinel intersects", async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByText("Item 0")).toBeInTheDocument();
    });

    expect(state.rpcCalls.filter((c) => c.name === "rank_products")).toHaveLength(1);
    expect(state.rpcCalls[0].args.result_offset).toBe(0);
    expect(state.observe).toHaveBeenCalled();

    await act(async () => {
      state.observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
      // Second callback while in-flight must not start another request
      state.observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Next Page Item")).toBeInTheDocument();
    });

    const rankCalls = state.rpcCalls.filter((c) => c.name === "rank_products");
    expect(rankCalls).toHaveLength(2);
    expect(rankCalls[1].args.result_offset).toBe(SEARCH_PAGE_SIZE);

    await waitFor(() => {
      expect(screen.getByText("No more listings")).toBeInTheDocument();
    });
  });

  it("disconnects the observer on unmount", async () => {
    const { unmount } = renderPage();
    await waitFor(() => expect(screen.getByText("Item 0")).toBeInTheDocument());
    expect(state.observe).toHaveBeenCalled();
    unmount();
    expect(state.disconnect).toHaveBeenCalled();
  });
});
