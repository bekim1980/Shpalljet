import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  initInstallPromptCapture,
  getDeferredInstallPrompt,
  clearDeferredInstallPrompt,
  subscribeInstallPrompt,
  runInstallPrompt,
} from "@/pwa/installPrompt";

describe("installPrompt", () => {
  beforeEach(() => {
    clearDeferredInstallPrompt();
    initInstallPromptCapture();
  });

  afterEach(() => {
    clearDeferredInstallPrompt();
  });

  it("stores beforeinstallprompt after preventDefault", () => {
    const event = new Event("beforeinstallprompt") as Event & {
      preventDefault: () => void;
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" }>;
    };
    event.preventDefault = vi.fn();
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: "accepted" });

    window.dispatchEvent(event);

    expect(event.preventDefault).toHaveBeenCalled();
    expect(getDeferredInstallPrompt()).toBe(event);
  });

  it("notifies subscribers when prompt is captured", () => {
    const listener = vi.fn();
    const unsub = subscribeInstallPrompt(listener);

    const event = new Event("beforeinstallprompt") as Event & {
      preventDefault: () => void;
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" }>;
    };
    event.preventDefault = vi.fn();
    event.prompt = vi.fn();
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);

    expect(listener).toHaveBeenCalled();
    unsub();
  });

  it("runInstallPrompt calls prompt and clears deferred", async () => {
    const event = new Event("beforeinstallprompt") as Event & {
      preventDefault: () => void;
      prompt: () => Promise<void>;
      userChoice: Promise<{ outcome: "accepted" }>;
    };
    event.preventDefault = vi.fn();
    event.prompt = vi.fn().mockResolvedValue(undefined);
    event.userChoice = Promise.resolve({ outcome: "accepted" });
    window.dispatchEvent(event);

    const outcome = await runInstallPrompt();
    expect(outcome).toBe("accepted");
    expect(event.prompt).toHaveBeenCalled();
    expect(getDeferredInstallPrompt()).toBeNull();
  });
});
