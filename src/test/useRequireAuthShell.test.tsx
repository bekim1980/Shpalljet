import { describe, expect, it, vi, beforeEach } from "vitest";
import { renderHook } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import type { ReactNode } from "react";

const openAuthShell = vi.fn();

vi.mock("@/contexts/AuthShellProvider", () => ({
  useAuthShell: () => ({ openAuthShell, closeAuthShell: vi.fn() }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: vi.fn(() => ({ user: null, loading: false })),
}));

import { useAuth } from "@/hooks/useAuth";
import { useRequireAuthShell } from "@/hooks/useRequireAuthShell";

const wrapper =
  (path = "/product/prod-1?tab=report#form") =>
  ({ children }: { children: ReactNode }) =>
    <MemoryRouter initialEntries={[path]}>{children}</MemoryRouter>;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(useAuth).mockReturnValue({ user: null, loading: false } as ReturnType<typeof useAuth>);
});

describe("useRequireAuthShell", () => {
  it("opens auth shell with full returnTo when logged out", () => {
    const { result } = renderHook(() => useRequireAuthShell(), {
      wrapper: wrapper("/product/prod-1?tab=report#form"),
    });

    const trigger = document.createElement("button");
    const onBeforeAuth = vi.fn();
    const action = vi.fn();

    const authed = result.current.requireAuth(action, {
      trigger,
      scrollY: 120,
      onBeforeAuth,
    });

    expect(authed).toBe(false);
    expect(onBeforeAuth).toHaveBeenCalledTimes(1);
    expect(openAuthShell).toHaveBeenCalledWith({
      returnTo: "/product/prod-1?tab=report#form",
      scrollY: 120,
      trigger,
    });
    expect(action).not.toHaveBeenCalled();
  });

  it("runs the action when logged in", () => {
    vi.mocked(useAuth).mockReturnValue({
      user: { id: "user-1" },
      loading: false,
    } as ReturnType<typeof useAuth>);

    const { result } = renderHook(() => useRequireAuthShell(), {
      wrapper: wrapper(),
    });

    const action = vi.fn();
    const onBeforeAuth = vi.fn();

    expect(result.current.requireAuth(action, { onBeforeAuth })).toBe(true);
    expect(action).toHaveBeenCalledTimes(1);
    expect(onBeforeAuth).not.toHaveBeenCalled();
    expect(openAuthShell).not.toHaveBeenCalled();
  });
});
