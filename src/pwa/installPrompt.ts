export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "shpalljet:installBannerDismissed";

let deferredPrompt: BeforeInstallPromptEvent | null = null;
const listeners = new Set<() => void>();

function logDev(...args: unknown[]) {
  if (import.meta.env.DEV) {
    console.debug("[pwa]", ...args);
  }
}

function notify() {
  listeners.forEach((fn) => fn());
}

/** Capture beforeinstallprompt as early as possible (before React mounts). */
export function initInstallPromptCapture() {
  if (typeof window === "undefined") return;

  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e as BeforeInstallPromptEvent;
    try {
      sessionStorage.removeItem(DISMISS_KEY);
    } catch {
      /* noop */
    }
    logDev("beforeinstallprompt fired");
    notify();
  });

  window.addEventListener("appinstalled", () => {
    logDev("appinstalled fired");
    deferredPrompt = null;
    dismissInstallBanner();
    notify();
  });
}

export function getDeferredInstallPrompt(): BeforeInstallPromptEvent | null {
  return deferredPrompt;
}

export function clearDeferredInstallPrompt() {
  deferredPrompt = null;
  notify();
}

export function subscribeInstallPrompt(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function isInstallBannerDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

export function dismissInstallBanner() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    /* noop */
  }
  notify();
}

export type InstallPromptOutcome = "accepted" | "dismissed" | "unavailable";

/** Invoke native install UI from a user gesture (button click). */
export async function runInstallPrompt(): Promise<InstallPromptOutcome> {
  const event = deferredPrompt ?? getDeferredInstallPrompt();
  if (!event) {
    logDev("runInstallPrompt: no deferred event");
    return "unavailable";
  }

  try {
    await event.prompt();
    const { outcome } = await event.userChoice;
    logDev("prompt userChoice:", outcome);
    clearDeferredInstallPrompt();
    dismissInstallBanner();
    return outcome;
  } catch (err) {
    logDev("prompt error:", err);
    clearDeferredInstallPrompt();
    return "dismissed";
  }
}
