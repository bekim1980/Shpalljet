import { registerSW } from "virtual:pwa-register";
import { toast } from "sonner";

export function initPwa() {
  if (!("serviceWorker" in navigator)) return;

  const updateSW = registerSW({
    immediate: true,
    onOfflineReady() {
      toast.message("Ready for limited offline use", {
        description: "The app shell is cached. Listings still need internet.",
      });
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
    onRegisterError(error) {
      console.error("SW registration failed:", error);
    },
  });
}
