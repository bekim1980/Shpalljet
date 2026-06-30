import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

export function initPwa() {
  if (!("serviceWorker" in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      if (import.meta.env.DEV) {
        console.debug("[pwa] offline shell cached (not shown to users)");
      }
    },
    onNeedRefresh() {
      toast("Update available", {
        description: "A new version of Shpalljet is ready.",
        action: {
          label: "Reload",
          onClick: () => updateSW(true),
        },
        duration: Infinity,
      });
    },
    onRegisteredSW(_url, registration) {
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
    onRegisterError(_error) {
      if (import.meta.env.DEV) {
        toast.error("Service worker registration failed");
      }
    },
  });
}
