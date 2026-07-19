/**
 * First-page search error/retry on SearchResults; next-page errors stay separate.
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent, act } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { SEARCH_PAGE_SIZE } from "@/hooks/useSearch";

type RpcResult = { data: unknown; error: unknown };

const state = vi.hoisted(() => ({
  searchCalls: 0,
  /** When true, every search RPC returns an error. */
  forceError: true,
  /** When true, the next search RPC hangs until hangResolve is called. */
  hangNext: false,
  hangResolve: null as ((value: RpcResult) => void) | null,
  /** empty | paged (full first page) | single */
  successShape: "single" as "single" | "empty" | "paged",
  /** After a successful first page, next-page RPCs fail. */
  failNextPage: false,
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

function isSearchRpc(name: string) {
  return name === "rank_products" || name === "search_products";
}

function successPayload(offset: number): RpcResult {
  if (state.successShape === "empty") {
    return { data: [], error: null };
  }
  if (state.successShape === "paged") {
    if (offset === 0) {
      const data = Array.from({ length: SEARCH_PAGE_SIZE }, (_, i) =>
        makeProduct(`p-${i}`, `Item ${i}`),
      );
      return { data, error: null };
    }
    if (state.failNextPage) {
      return { data: null, error: { message: "next page failed" } };
    }
    return { data: [makeProduct("p-next", "Next Page Item")], error: null };
  }
  return { data: [makeProduct("p-retry", "Retry Item")], error: null };
}

vi.mock("@/integrations/supabase/client", () => {
  const rpc = vi.fn(async (name: string, args: Record<string, unknown> = {}) => {
    if (!isSearchRpc(name)) {
      return { data: [], error: null };
    }

    state.searchCalls += 1;
    const offset = Number(args.result_offset ?? 0);

    if (state.hangNext) {
      state.hangNext = false;
      return new Promise<RpcResult>((resolve) => {
        state.hangResolve = resolve;
      });
    }

    if (state.forceError) {
      return { data: null, error: { message: "search failed" } };
    }

    return successPayload(offset);
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
              order: () => Promise.resolve({ data: [], error: null }),
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

function renderSearch(path = "/search?q=alpha") {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/search" element={<SearchResults />} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  state.searchCalls = 0;
  state.forceError = true;
  state.hangNext = false;
  state.hangResolve = null;
  state.successShape = "single";
  state.failNextPage = false;
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

describe("SearchResults first-page error handling", () => {
  it("shows error and retry when the initial request fails", async () => {
    renderSearch();

    await waitFor(() => {
      expect(screen.getByText("Could not load listings.")).toBeInTheDocument();
    });
    expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    expect(screen.queryByText("search.noResults")).not.toBeInTheDocument();
  });

  it("retry triggers another request and can load results", async () => {
    renderSearch();

    await waitFor(() => {
      expect(screen.getByText("Could not load listings.")).toBeInTheDocument();
    });

    const callsBefore = state.searchCalls;
    state.forceError = false;

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });

    await waitFor(() => {
      expect(screen.getByText("Retry Item")).toBeInTheDocument();
    });
    expect(state.searchCalls).toBeGreaterThan(callsBefore);
    expect(screen.queryByText("Could not load listings.")).not.toBeInTheDocument();
  });

  it("disables retry while a retry request is in progress", async () => {
    renderSearch();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry" })).toBeInTheDocument();
    });

    state.forceError = false;
    state.hangNext = true;

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Retry" })).toBeDisabled();
    });

    const callsWhilePending = state.searchCalls;

    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    });

    expect(state.searchCalls).toBe(callsWhilePending);

    await act(async () => {
      state.hangResolve?.({
        data: [makeProduct("p-retry", "Retry Item")],
        error: null,
      });
      state.hangResolve = null;
    });

    await waitFor(() => {
      expect(screen.getByText("Retry Item")).toBeInTheDocument();
    });
  });

  it("shows the normal empty state for a successful empty result", async () => {
    state.forceError = false;
    state.successShape = "empty";
    renderSearch();

    await waitFor(() => {
      expect(screen.getByText("search.noResults")).toBeInTheDocument();
    });
    expect(screen.queryByText("Could not load listings.")).not.toBeInTheDocument();
  });

  it("keeps next-page error UI when later pages fail", async () => {
    state.forceError = false;
    state.successShape = "paged";
    state.failNextPage = true;
    renderSearch();

    await waitFor(() => {
      expect(screen.getByText("Item 0")).toBeInTheDocument();
    });
    expect(screen.queryByText("Could not load listings.")).not.toBeInTheDocument();

    await act(async () => {
      state.observerCallback?.(
        [{ isIntersecting: true } as IntersectionObserverEntry],
        {} as IntersectionObserver,
      );
    });

    await waitFor(() => {
      expect(screen.getByText("Could not load more listings.")).toBeInTheDocument();
    });
    expect(screen.getByText("Item 0")).toBeInTheDocument();
    expect(screen.queryByText("Could not load listings.")).not.toBeInTheDocument();
  });
});
