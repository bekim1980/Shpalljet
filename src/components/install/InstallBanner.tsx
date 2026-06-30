import { Download, Share2, X } from "lucide-react";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useInstallPrompt } from "@/hooks/useInstallPrompt";

const HIDDEN_ROUTES = new Set(["/login", "/auth/callback"]);

export default function InstallBanner() {
  const { pathname } = useLocation();
  const { browser, canNativePrompt, showIosHint, installed, dismissed, busy, dismiss, install } =
    useInstallPrompt();

  if (installed || dismissed || HIDDEN_ROUTES.has(pathname)) return null;
  if (!canNativePrompt && !showIosHint) return null;

  const handleInstall = async () => {
    const outcome = await install();
    if (outcome === "dismissed" || outcome === "unavailable") {
      dismiss();
    }
  };

  return (
    <div
      role="region"
      aria-label="Install Shpalljet"
      className="sticky top-0 z-[60] border-b border-gold/25 bg-gradient-to-r from-background via-card to-background shadow-sm"
      data-testid="install-banner"
    >
      <div className="container flex items-center gap-3 px-4 py-2.5 min-h-[48px]">
        <div className="flex-1 min-w-0">
          {canNativePrompt ? (
            <p className="text-sm text-foreground truncate">
              <span className="font-semibold text-gold">Install Shpalljet</span>
              <span className="text-muted-foreground hidden sm:inline">
                {" "}
                — open from your home screen, app-like experience
              </span>
            </p>
          ) : (
            <p className="text-sm text-foreground">
              <span className="font-semibold text-gold">Add to Home Screen</span>
              <span className="text-muted-foreground">
                {" "}
                — tap <Share2 className="inline h-3.5 w-3.5 mx-0.5 align-text-bottom" /> Share, then
                “Add to Home Screen”
              </span>
            </p>
          )}
        </div>

        {canNativePrompt ? (
          <Button
            size="sm"
            variant="gold"
            className="shrink-0 h-9 px-4"
            disabled={busy}
            onClick={handleInstall}
            data-testid="install-banner-cta"
          >
            <Download className="h-4 w-4 mr-1.5" />
            Install
          </Button>
        ) : (
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground shrink-0 hidden xs:inline">
            {browser.label}
          </span>
        )}

        <button
          type="button"
          aria-label="Dismiss install banner"
          className="shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
          onClick={dismiss}
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
