import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import SafeImage from "./SafeImage";
import { resolveProductImageUrl } from "@/lib/productImage";

interface FullscreenViewerProps {
  images: string[];
  startIndex: number;
  onClose: () => void;
}

const FullscreenViewer = ({ images, startIndex, onClose }: FullscreenViewerProps) => {
  const [idx, setIdx] = useState(startIndex);
  const [scale, setScale] = useState(1);
  const touchStart = useRef(0);
  const touchStartY = useRef(0);
  const lastTap = useRef(0);

  const prev = useCallback(() => setIdx((i) => (i > 0 ? i - 1 : i)), []);
  const next = useCallback(() => setIdx((i) => (i < images.length - 1 ? i + 1 : i)), [images.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    document.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose, prev, next]);

  // Reset zoom on image change
  useEffect(() => {
    setScale(1);
  }, [idx]);

  const handleDoubleTap = () => {
    setScale((s) => (s > 1 ? 1 : 2.5));
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStart.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;

    // Double-tap detection
    const now = Date.now();
    if (now - lastTap.current < 300) {
      handleDoubleTap();
    }
    lastTap.current = now;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (scale > 1) return; // Don't swipe while zoomed
    const dx = touchStart.current - e.changedTouches[0].clientX;
    const dy = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 50) {
      if (dx > 0) { next(); } else { prev(); }
    }
    if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > 80) {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-black flex flex-col"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-3 shrink-0">
          <span className="text-white/70 text-sm font-medium">
            {idx + 1} / {images.length}
          </span>
          <button onClick={onClose} className="text-white/70 hover:text-white p-2 -m-1">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Image area */}
        <div
          className="flex-1 flex items-center justify-center relative select-none min-h-0 overflow-hidden"
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <motion.div
            animate={{ scale }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="max-w-full max-h-full flex items-center justify-center"
          >
            <SafeImage
              src={resolveProductImageUrl(images[idx], "large") ?? images[idx]}
              className="max-w-full max-h-full object-contain px-2"
              responsive
              sizesAttr="100vw"
            />
          </motion.div>

          {/* Navigation arrows */}
          {images.length > 1 && (
            <>
              {idx > 0 && (
                <button
                  onClick={prev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              {idx < images.length - 1 && (
                <button
                  onClick={next}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              )}
            </>
          )}
        </div>

        {/* Thumbnail strip */}
        {images.length > 1 && (
          <div className="shrink-0 flex justify-center gap-1.5 p-3 overflow-x-auto">
            {images.map((url, i) => (
              <button
                key={i}
                onClick={() => setIdx(i)}
                className={`w-12 h-12 rounded-md overflow-hidden border-2 shrink-0 transition-all ${
                  i === idx
                    ? "border-white opacity-100"
                    : "border-transparent opacity-50 hover:opacity-75"
                }`}
              >
                <img
                  src={resolveProductImageUrl(url, "thumb") ?? url}
                  alt=""
                  className="w-full h-full object-cover"
                  loading="lazy"
                  decoding="async"
                />
              </button>
            ))}
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
};

export default FullscreenViewer;
