import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { restoreAuthShellScrollAndFocus } from "@/lib/authShellScrollRestore";
import { AuthShellProvider, useAuthShell } from "@/contexts/AuthShellProvider";
import { captureAuthShellContext, useAuthShellTriggerCapture, useRequireAuthShell } from "@/hooks/useRequireAuthShell";

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({ user: null, loading: false }),
}));

const useIsMobileMock = vi.fn(() => false);
vi.mock("@/hooks/use-mobile", () => ({
  useIsMobile: () => useIsMobileMock(),
}));

vi.mock("react-i18next", () => ({
  useTranslation: () => ({
    t: (key: string, defaultValue?: string) => defaultValue ?? key,
  }),
}));

const rafQueue: FrameRequestCallback[] = [];

function flushRaf(count = 1) {
  for (let i = 0; i < count; i++) {
    const callbacks = rafQueue.splice(0);
    callbacks.forEach((cb) => cb(0));
  }
}

function flushAllRaf() {
  while (rafQueue.length > 0) flushRaf();
}

const OpenCloseHarness = ({
  scrollY = 420,
  onTriggerRef,
}: {
  scrollY?: number;
  onTriggerRef?: (el: HTMLButtonElement) => void;
}) => {
  const { openAuthShell } = useAuthShell();
  return (
    <button
      type="button"
      data-testid="trigger"
      ref={(el) => {
        if (el) onTriggerRef?.(el);
      }}
      onClick={() =>
        openAuthShell({
          returnTo: "/product/test?qa=scroll#actions",
          scrollY,
          trigger: document.querySelector<HTMLButtonElement>("[data-testid='trigger']"),
        })
      }
    >
      Open auth
    </button>
  );
};

const ProductDetailActionsHarness = ({
  action,
  onTriggerRef,
}: {
  action: "wishlist" | "message";
  onTriggerRef?: (el: HTMLButtonElement) => void;
}) => {
  const { requireAuth } = useRequireAuthShell();
  const authCapture = useAuthShellTriggerCapture();

  const handleWishlist = () => {
    requireAuth(() => {}, authCapture.pointerOptions());
  };

  const handleMessage = () => {
    if (!requireAuth(() => {}, authCapture.pointerOptions())) return;
  };

  return (
    <div>
      <div data-testid="spacer" style={{ height: "1200px" }} />
      {action === "wishlist" ? (
        <button
          type="button"
          data-testid="pdp-wishlist"
          ref={onTriggerRef}
          onPointerDown={authCapture.onPointerDown}
          onClick={handleWishlist}
        >
          Wishlist
        </button>
      ) : (
        <button
          type="button"
          data-testid="pdp-message"
          ref={onTriggerRef}
          onPointerDown={authCapture.onPointerDown}
          onClick={handleMessage}
        >
          Message seller
        </button>
      )}
    </div>
  );
};

describe("restoreAuthShellScrollAndFocus", () => {
  beforeEach(() => {
    rafQueue.length = 0;
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("restores scroll after Radix unlock frames, then focuses with preventScroll", () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;

    const trigger = document.createElement("button");
    document.body.appendChild(trigger);
    const focusSpy = vi.spyOn(trigger, "focus");

    restoreAuthShellScrollAndFocus(512, trigger);

    expect(scrollTo).not.toHaveBeenCalled();
    expect(focusSpy).not.toHaveBeenCalled();

    flushAllRaf();
    expect(scrollTo).toHaveBeenCalledWith({ top: 512, left: 0, behavior: "auto" });
    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
    expect(scrollTo.mock.calls.length).toBeGreaterThanOrEqual(2);

    trigger.remove();
  });

  it("skips focus when trigger is disconnected", () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;
    const trigger = document.createElement("button");

    restoreAuthShellScrollAndFocus(300, trigger);
    flushAllRaf();

    expect(scrollTo).toHaveBeenCalled();
    trigger.remove();
  });
});

describe("AuthShellProvider scroll restore integration", () => {
  beforeEach(() => {
    rafQueue.length = 0;
    useIsMobileMock.mockReturnValue(false);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    Object.defineProperty(window, "scrollY", { value: 420, configurable: true, writable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const renderShell = (scrollY = 420) => {
    let triggerEl: HTMLButtonElement | null = null;
    render(
      <MemoryRouter>
        <AuthShellProvider>
          <OpenCloseHarness scrollY={scrollY} onTriggerRef={(el) => { triggerEl = el; }} />
        </AuthShellProvider>
      </MemoryRouter>,
    );
    return { getTrigger: () => triggerEl };
  };

  const openAndCloseShell = async () => {
    fireEvent.click(screen.getByTestId("trigger"));
    expect(await screen.findByRole("textbox", { name: /email/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("textbox", { name: /email/i })).not.toBeInTheDocument();
    });
  };

  it("restores captured scroll on Dialog close (desktop path)", async () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;

    renderShell(420);
    await openAndCloseShell();
    flushAllRaf();

    expect(scrollTo).toHaveBeenCalledWith({ top: 420, left: 0, behavior: "auto" });
  });

  it("returns focus to trigger without requiring scroll into view", async () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;

    const { getTrigger } = renderShell(500);
    const trigger = getTrigger()!;
    const focusSpy = vi.spyOn(trigger, "focus");

    fireEvent.click(trigger);
    await openAndCloseShell();
    flushAllRaf();

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });

  it("restores captured scroll on Sheet close (mobile path)", async () => {
    useIsMobileMock.mockReturnValue(true);

    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;

    renderShell(380);
    await openAndCloseShell();
    flushAllRaf();

    expect(scrollTo).toHaveBeenCalledWith({ top: 380, left: 0, behavior: "auto" });
  });
});

describe("ProductDetail scrolled auth shell close", () => {
  beforeEach(() => {
    rafQueue.length = 0;
    useIsMobileMock.mockReturnValue(false);
    vi.stubGlobal("requestAnimationFrame", (cb: FrameRequestCallback) => {
      rafQueue.push(cb);
      return rafQueue.length;
    });
    Object.defineProperty(window, "scrollY", { value: 420, configurable: true, writable: true });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  const closeShell = async () => {
    fireEvent.keyDown(document, { key: "Escape", code: "Escape" });
    await waitFor(() => {
      expect(screen.queryByRole("textbox", { name: /email/i })).not.toBeInTheDocument();
    });
    flushAllRaf();
  };

  it("restores scroll after scrolled wishlist auth shell closes", async () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;

    render(
      <MemoryRouter initialEntries={["/product/test?qa=scroll#actions"]}>
        <AuthShellProvider>
          <ProductDetailActionsHarness action="wishlist" />
        </AuthShellProvider>
      </MemoryRouter>,
    );

    Object.defineProperty(window, "scrollY", { value: 420, configurable: true, writable: true });
    const wishlist = screen.getByTestId("pdp-wishlist");
    fireEvent.pointerDown(wishlist);
    fireEvent.click(wishlist);
    expect(await screen.findByRole("textbox", { name: /email/i })).toBeInTheDocument();
    await closeShell();

    expect(scrollTo).toHaveBeenCalledWith({ top: 420, left: 0, behavior: "auto" });
  });

  it("restores scroll after scrolled message seller auth shell closes", async () => {
    const scrollTo = vi.fn();
    window.scrollTo = scrollTo as typeof window.scrollTo;

    render(
      <MemoryRouter initialEntries={["/product/test?qa=scroll#actions"]}>
        <AuthShellProvider>
          <ProductDetailActionsHarness action="message" />
        </AuthShellProvider>
      </MemoryRouter>,
    );

    Object.defineProperty(window, "scrollY", { value: 500, configurable: true, writable: true });
    const message = screen.getByTestId("pdp-message");
    fireEvent.pointerDown(message);
    fireEvent.click(message);
    expect(await screen.findByRole("textbox", { name: /email/i })).toBeInTheDocument();
    await closeShell();

    expect(scrollTo).toHaveBeenCalledWith({ top: 500, left: 0, behavior: "auto" });
  });

  it("returns focus to the original trigger with preventScroll", async () => {
    render(
      <MemoryRouter>
        <AuthShellProvider>
          <ProductDetailActionsHarness action="message" />
        </AuthShellProvider>
      </MemoryRouter>,
    );

    Object.defineProperty(window, "scrollY", { value: 500, configurable: true, writable: true });
    const trigger = screen.getByTestId("pdp-message");
    const focusSpy = vi.spyOn(trigger, "focus");

    fireEvent.pointerDown(trigger);
    fireEvent.click(trigger);
    await screen.findByRole("textbox", { name: /email/i });
    await closeShell();

    expect(focusSpy).toHaveBeenCalledWith({ preventScroll: true });
  });
});
