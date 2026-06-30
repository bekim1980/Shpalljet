import { motion } from "framer-motion";
import { Share, Plus, MoreVertical, Menu, Download } from "lucide-react";
import type { BrowserInfo } from "@/lib/browserDetect";

type Step = { icon: React.ReactNode; text: string };

function stepsFor(b: BrowserInfo): Step[] {
  switch (b.id) {
    case "ios-safari":
      return [
        { icon: <Share className="h-4 w-4" />, text: "Tap the Share button in Safari" },
        { icon: <Plus className="h-4 w-4" />, text: "Scroll and choose “Add to Home Screen”" },
        { icon: <Download className="h-4 w-4" />, text: "Tap “Add” to confirm" },
      ];
    case "ios-chrome":
    case "ios-other":
      return [
        { icon: <Share className="h-4 w-4" />, text: "For best results, open this page in Safari" },
        { icon: <Plus className="h-4 w-4" />, text: "Then tap Share → “Add to Home Screen”" },
        { icon: <Download className="h-4 w-4" />, text: "Confirm with “Add”" },
      ];
    case "android-samsung":
      return [
        { icon: <Menu className="h-4 w-4" />, text: "Open the menu (☰) at the bottom right" },
        { icon: <Plus className="h-4 w-4" />, text: "Tap “Add page to” → “Home screen”" },
        { icon: <Download className="h-4 w-4" />, text: "Confirm to install Shpalljet" },
      ];
    case "android-firefox":
      return [
        { icon: <MoreVertical className="h-4 w-4" />, text: "Open the ⋮ menu in Firefox" },
        { icon: <Plus className="h-4 w-4" />, text: "Tap “Install” or “Add to Home screen”" },
        { icon: <Download className="h-4 w-4" />, text: "Confirm to add the app" },
      ];
    case "android-opera":
      return [
        { icon: <MoreVertical className="h-4 w-4" />, text: "Open the Opera menu" },
        { icon: <Plus className="h-4 w-4" />, text: "Tap “Add to…” → “Home screen”" },
        { icon: <Download className="h-4 w-4" />, text: "Confirm to install" },
      ];
    case "android-chrome":
    case "android-edge":
      return [
        { icon: <MoreVertical className="h-4 w-4" />, text: "Tap the ⋮ menu in the top right" },
        { icon: <Download className="h-4 w-4" />, text: "Choose “Install app” or “Add to Home screen”" },
        { icon: <Plus className="h-4 w-4" />, text: "Confirm to add Shpalljet" },
      ];
    case "desktop-chrome":
    case "desktop-edge":
      return [
        { icon: <Download className="h-4 w-4" />, text: "Click the install icon in the address bar" },
        { icon: <Plus className="h-4 w-4" />, text: "Or open menu → “Install Shpalljet”" },
        { icon: <Download className="h-4 w-4" />, text: "Confirm to install on your desktop" },
      ];
    default:
      return [
        { icon: <Share className="h-4 w-4" />, text: "Open this page in Chrome, Edge, Safari or Samsung Internet" },
        { icon: <Plus className="h-4 w-4" />, text: "Use the browser menu to “Install” or “Add to Home screen”" },
        { icon: <Download className="h-4 w-4" />, text: "Confirm to add Shpalljet" },
      ];
  }
}

export default function InstallInstructions({ browser }: { browser: BrowserInfo }) {
  const steps = stepsFor(browser);
  return (
    <div className="glass-card rounded-2xl p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-base font-semibold">How to install</h2>
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground px-2 py-1 rounded-full border border-border/60">
          {browser.label}
        </span>
      </div>
      <ol className="space-y-3">
        {steps.map((s, i) => (
          <motion.li
            key={i}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.05 * i, duration: 0.35 }}
            className="flex items-start gap-3"
          >
            <span className="relative shrink-0">
              <span className="flex items-center justify-center w-8 h-8 rounded-full bg-gradient-gold text-primary-foreground text-xs font-bold shadow-gold">
                {i + 1}
              </span>
            </span>
            <div className="flex-1 pt-1 flex items-center gap-2 text-sm text-foreground/90">
              <span className="text-gold opacity-80">{s.icon}</span>
              <span>{s.text}</span>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
