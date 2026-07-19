import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Sparkles, Store } from "lucide-react";

const discoverShot = "/screenshots/discover.png";
const browseShot = "/screenshots/browse.png";
const searchShot = "/screenshots/search.png";

type Slide = {
  title: string;
  caption: string;
  icon: React.ReactNode;
  accent: string;
  image: string;
};

const SLIDES: Slide[] = [
  {
    title: "Discover",
    caption: "Curated luxury & everyday finds",
    icon: <Sparkles className="h-4 w-4" />,
    accent: "from-gold/30 to-transparent",
    image: discoverShot,
  },
  {
    title: "Browse",
    caption: "Listings across all verticals",
    icon: <Store className="h-4 w-4" />,
    accent: "from-gold-light/30 to-transparent",
    image: browseShot,
  },
  {
    title: "Search",
    caption: "Find anything in seconds",
    icon: <Search className="h-4 w-4" />,
    accent: "from-gold-dark/40 to-transparent",
    image: searchShot,
  },
];

export default function PreviewCarousel() {
  const [i, setI] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 3200);
    return () => clearInterval(t);
  }, []);
  const s = SLIDES[i];

  return (
    <div className="relative mx-auto w-full max-w-[260px]">
      {/* Phone frame */}
      <div className="relative aspect-[9/19] rounded-[2.2rem] border border-gold/30 bg-gradient-to-b from-card to-background shadow-[0_30px_60px_-20px_hsl(42_65%_55%/0.25)] overflow-hidden">
        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-20 h-5 rounded-full bg-black/80 z-20" />

        <AnimatePresence mode="wait">
          <motion.img
            key={i}
            src={s.image}
            alt={`${s.title} — Shpalljet`}
            loading="lazy"
            initial={{ opacity: 0, scale: 1.04 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            className="absolute inset-0 h-full w-full object-cover object-top"
          />
        </AnimatePresence>

        {/* Bottom caption overlay */}
        <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black/85 via-black/50 to-transparent px-4 pt-10 pb-4">
          <div className="flex items-center gap-1.5 text-gold">
            {s.icon}
            <span className="font-display text-[10px] uppercase tracking-[0.22em]">
              {s.title}
            </span>
          </div>
          <p className="mt-1 font-display text-sm leading-snug text-white">
            {s.caption}
          </p>
        </div>
      </div>

      {/* Dots */}
      <div className="mt-3 flex items-center justify-center gap-1.5">
        {SLIDES.map((_, k) => (
          <button
            key={k}
            aria-label={`Slide ${k + 1}`}
            onClick={() => setI(k)}
            className={`h-1.5 rounded-full transition-all ${
              k === i ? "w-6 bg-gold" : "w-1.5 bg-border"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
