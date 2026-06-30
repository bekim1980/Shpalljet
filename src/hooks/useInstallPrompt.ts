import { useCallback, useEffect, useMemo, useState } from "react";
import { detectBrowser, isStandalone } from "@/lib/browserDetect";
import {
  dismissInstallBanner,
  getDeferredInstallPrompt,
  isInstallBannerDismissed,
  runInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/pwa/installPrompt";

export function useInstallPrompt() {
  const browser = useMemo(() => detectBrowser(), []);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(() =>
    getDeferredInstallPrompt(),
  );
  const [installed, setInstalled] = useState(() => isStandalone());
  const [dismissed, setDismissed] = useState(() => isInstallBannerDismissed());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const sync = () => {
      setDeferred(getDeferredInstallPrompt());
      setInstalled(isStandalone());
      setDismissed(isInstallBannerDismissed());
    };
    sync();

    const unsub = subscribeInstallPrompt(sync);

    const mq = window.matchMedia("(display-mode: standalone)");
    const onDisplayMode = () => setInstalled(isStandalone());
    mq.addEventListener("change", onDisplayMode);

    const onInstalled = () => {
      setInstalled(true);
      setDeferred(null);
      setDismissed(true);
    };
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      unsub();
      mq.removeEventListener("change", onDisplayMode);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const canNativePrompt = deferred !== null && !installed && !dismissed;
  const showIosHint =
    !installed && !dismissed && browser.isIos && deferred === null;

  const dismiss = useCallback(() => {
    dismissInstallBanner();
    setDismissed(true);
  }, []);

  const install = useCallback(async () => {
    setBusy(true);
    try {
      return await runInstallPrompt();
    } finally {
      setBusy(false);
      setDeferred(getDeferredInstallPrompt());
      setDismissed(isInstallBannerDismissed());
      setInstalled(isStandalone());
    }
  }, []);

  return {
    browser,
    deferred,
    installed,
    dismissed,
    busy,
    canNativePrompt,
    showIosHint,
    dismiss,
    install,
  };
}
