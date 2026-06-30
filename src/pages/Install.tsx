import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Check, Sparkles, Zap, Smartphone, RefreshCw, Share2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import PreviewCarousel from "@/components/install/PreviewCarousel";
import InstallInstructions from "@/components/install/InstallInstructions";
import { detectBrowser, isStandalone } from "@/lib/browserDetect";
import {
  getDeferredInstallPrompt,
  clearDeferredInstallPrompt,
  subscribeInstallPrompt,
  type BeforeInstallPromptEvent,
} from "@/pwa/installPrompt";
import { toast } from "sonner";

const PROMPT_WAIT_MS = 3000;

const Install = () => {
  const browser = useMemo(() => detectBrowser(), []);
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(() => getDeferredInstallPrompt());
  const [installed, setInstalled] = useState(() => isStandalone());
  const [busy, setBusy] = useState(false);
  const [promptTimedOut, setPromptTimedOut] = useState(false);

  useEffect(() => {
    const sync = () => {
      setInstalled(isStandalone());
      setDeferred(getDeferredInstallPrompt());
    };
    sync();

    const unsub = subscribeInstallPrompt(sync);

    const onInstalled = () => {
      setInstalled(true);
      clearDeferredInstallPrompt();
      toast.success("Shpalljet installed", { description: "Open it from your home screen anytime." });
    };
    window.addEventListener("appinstalled", onInstalled);

    const mq = window.matchMedia("(display-mode: standalone)");
    const onDisplayMode = () => setInstalled(isStandalone());
    mq.addEventListener("change", onDisplayMode);

    return () => {
      unsub();
      window.removeEventListener("appinstalled", onInstalled);
      mq.removeEventListener("change", onDisplayMode);
    };
  }, []);

  useEffect(() => {
    if (installed || deferred || !browser.supportsNativePrompt) return;
    const timer = window.setTimeout(() => setPromptTimedOut(true), PROMPT_WAIT_MS);
    return () => window.clearTimeout(timer);
  }, [installed, deferred, browser.supportsNativePrompt]);

  const handleInstall = async () => {
    const promptEvent = deferred ?? getDeferredInstallPrompt();
    if (!promptEvent) return;
    try {
      setBusy(true);
      await promptEvent.prompt();
      const { outcome } = await promptEvent.userChoice;
      if (outcome === "accepted") setInstalled(true);
      else toast("Maybe later", { description: "You can install Shpalljet anytime from this page." });
    } finally {
      setBusy(false);
      clearDeferredInstallPrompt();
      setDeferred(null);
    }
  };

  const handleShare = async () => {
    const url = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "Shpalljet", text: "Install Shpalljet on your phone", url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied", { description: "Open it on your phone to install." });
      }
    } catch {
      /* user cancelled */
    }
  };

  const waitingForPrompt =
    !installed && !deferred && browser.supportsNativePrompt && !promptTimedOut;
  const showNativeCTA = !installed && (deferred !== null || waitingForPrompt);

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* Ambient luxury glow */}
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 h-[420px] bg-[radial-gradient(ellipse_at_top,hsl(42_65%_55%/0.12),transparent_60%)]" />

      <main className="relative container max-w-md px-4 pt-6 pb-12 space-y-6">
        {/* Hero */}
        <motion.section
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
          className="text-center space-y-3 pt-2"
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-gold/30 bg-gold/5 text-gold text-[10px] uppercase tracking-[0.18em]">
            <Sparkles className="h-3 w-3" /> Premium app
          </div>
          <h1 className="font-display text-[2rem] leading-tight font-bold tracking-tight">
            Install <span className="text-gradient-gold">Shpalljet</span>
          </h1>
          <p className="text-sm text-muted-foreground px-2">
            The luxury marketplace, one tap away on your home screen.
          </p>
        </motion.section>

        {/* Preview */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, delay: 0.05 }}
        >
          <PreviewCarousel />
        </motion.section>

        {/* CTA / State */}
        <AnimatePresence mode="wait">
          {installed ? (
            <motion.section
              key="done"
              initial={{ opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card rounded-2xl p-6 text-center space-y-3"
            >
              <div className="w-14 h-14 mx-auto rounded-full bg-gradient-gold flex items-center justify-center shadow-gold">
                <Check className="h-7 w-7 text-primary-foreground" />
              </div>
              <h2 className="font-display text-lg font-semibold">Shpalljet is already installed</h2>
              <p className="text-sm text-muted-foreground">Shpalljet now lives on your home screen.</p>
              <Button variant="gold" size="lg" className="w-full mt-2" onClick={() => (window.location.href = "/")}>
                Open Shpalljet
              </Button>
            </motion.section>
          ) : showNativeCTA ? (
            <motion.section
              key="cta"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="space-y-3"
            >
              <Button
                variant="gold"
                size="lg"
                className="w-full h-14 text-base rounded-2xl shadow-gold relative overflow-hidden group"
                onClick={handleInstall}
                disabled={busy || !deferred}
              >
                <span className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                {busy ? <Loader2 className="h-5 w-5 mr-2 animate-spin" /> : <Download className="h-5 w-5 mr-2" />}
                {deferred ? "Install Shpalljet" : "Preparing install…"}
              </Button>
              {waitingForPrompt && (
                <p className="text-[11px] text-center text-muted-foreground">
                  If nothing happens, follow the steps below to install manually.
                </p>
              )}
            </motion.section>
          ) : (
            <motion.section
              key="manual"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <Button variant="gold-outline" size="lg" className="w-full h-14 rounded-2xl" onClick={handleShare}>
                <Share2 className="h-5 w-5 mr-2" />
                Share link to your phone
              </Button>
            </motion.section>
          )}
        </AnimatePresence>

        {/* Browser-specific instructions */}
        {!installed && <InstallInstructions browser={browser} />}

        {/* Benefits */}
        <section className="grid grid-cols-3 gap-2">
          {[
            { icon: <Zap className="h-4 w-4" />, title: "Fast", desc: "Open from home screen" },
            { icon: <Smartphone className="h-4 w-4" />, title: "App-like", desc: "Full-screen experience" },
            { icon: <RefreshCw className="h-4 w-4" />, title: "Auto-update", desc: "Always the latest version" },
          ].map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 + i * 0.06 }}
              className="glass-card rounded-xl p-3 text-center space-y-1"
            >
              <div className="w-8 h-8 mx-auto rounded-full bg-gold/10 text-gold flex items-center justify-center">
                {f.icon}
              </div>
              <p className="text-xs font-semibold">{f.title}</p>
              <p className="text-[10px] text-muted-foreground leading-tight">{f.desc}</p>
            </motion.div>
          ))}
        </section>

        <p className="text-center text-[10px] text-muted-foreground/70 pt-2">
          No app store needed · Free · Updates automatically
        </p>
      </main>
    </div>
  );
};

export default Install;
