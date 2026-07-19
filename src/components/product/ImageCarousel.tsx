import { useState, useRef, useCallback } from "react";
import { Heart, ChevronLeft, ChevronRight } from "lucide-react";
import SafeImage from "./SafeImage";
import { resolveProductImageUrl } from "@/lib/productImage";

interface ImageCarouselProps {
  images: string[];
  onImageTap: (index: number) => void;
  isWished: boolean;
  onWishlist: () => void;
  onWishlistPointerDown?: (e: React.PointerEvent<HTMLElement>) => void;
  condition: string;
}

const ImageCarousel = ({ images, onImageTap, isWished, onWishlist, onWishlistPointerDown, condition }: ImageCarouselProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);

  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = Math.round(el.scrollLeft / el.clientWidth);
    setActiveIdx(idx);
  }, []);

  const scrollToIdx = useCallback((i: number) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ left: i * el.clientWidth, behavior: "smooth" });
  }, []);

  if (images.length === 0) {
    return (
      <div className="relative aspect-square bg-secondary/30 flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-16 h-16 rounded-full bg-muted/50 flex items-center justify-center">
            <Heart className="h-6 w-6 text-muted-foreground/30" />
          </div>
          <span className="text-muted-foreground/40 text-sm">No images available</span>
        </div>
        <button
          onPointerDown={onWishlistPointerDown}
          onClick={() => onWishlist()}
          aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
          aria-pressed={isWished}
          className="absolute top-3 right-3 p-2.5 min-h-10 min-w-10 rounded-full bg-background/80 backdrop-blur-sm"
        >
          <Heart className={`h-5 w-5 ${isWished ? "fill-primary text-primary" : "text-foreground/70"}`} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide aspect-square"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {images.map((url, i) => (
          <SafeImage
            key={i}
            src={url}
            onClick={() => onImageTap(i)}
            className="min-w-full w-full h-full object-cover flex-shrink-0 snap-center cursor-zoom-in"
            loading={i === 0 ? "eager" : "lazy"}
          />
        ))}
      </div>

      {/* Counter badge */}
      {images.length > 1 && (
        <span className="absolute bottom-3 right-3 text-xs font-medium px-2.5 py-1 rounded-full bg-black/60 text-white backdrop-blur-sm">
          {activeIdx + 1} / {images.length}
        </span>
      )}

      {/* Dots */}
      {images.length > 1 && images.length <= 8 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => scrollToIdx(i)}
              aria-label={`Go to image ${i + 1}`}
              aria-current={i === activeIdx ? "true" : undefined}
              className={`h-1.5 rounded-full transition-all ${i === activeIdx ? "bg-white w-3" : "bg-white/50 w-1.5"}`}
            />
          ))}
        </div>
      )}

      {/* Desktop arrows */}
      {images.length > 1 && (
        <>
          {activeIdx > 0 && (
            <button
              type="button"
              onClick={() => scrollToIdx(activeIdx - 1)}
              aria-label="Previous image"
              className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-background transition-colors"
            >
              <ChevronLeft className="h-5 w-5 text-foreground/70" />
            </button>
          )}
          {activeIdx < images.length - 1 && (
            <button
              type="button"
              onClick={() => scrollToIdx(activeIdx + 1)}
              aria-label="Next image"
              className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm shadow-md hover:bg-background transition-colors"
            >
              <ChevronRight className="h-5 w-5 text-foreground/70" />
            </button>
          )}
        </>
      )}

      {/* Overlays */}
      <button
        onPointerDown={onWishlistPointerDown}
        onClick={() => onWishlist()}
        aria-label={isWished ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={isWished}
        className="absolute top-3 right-3 p-2.5 min-h-10 min-w-10 rounded-full bg-background/80 backdrop-blur-sm shadow-md"
      >
        <Heart className={`h-5 w-5 transition-colors ${isWished ? "fill-primary text-primary" : "text-foreground/70"}`} />
      </button>
      <span className="absolute top-3 left-3 text-xs font-medium px-2.5 py-1 rounded-full bg-background/80 backdrop-blur-sm text-foreground/80 capitalize shadow-sm">
        {condition}
      </span>

      {/* Thumbnail strip */}
      {images.length > 1 && (
        <div className="flex gap-2 p-2 overflow-x-auto scrollbar-hide">
          {images.map((url, i) => (
            <button
              key={i}
              type="button"
              onClick={() => scrollToIdx(i)}
              aria-label={`View image ${i + 1}`}
              aria-current={i === activeIdx ? "true" : undefined}
              className={`w-14 h-14 md:w-16 md:h-16 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${
                i === activeIdx
                  ? "border-primary ring-1 ring-primary/30 opacity-100"
                  : "border-border/30 opacity-60 hover:opacity-90"
              }`}
            >
              <SafeImage
                src={resolveProductImageUrl(url, "thumb") ?? url}
                alt=""
                className="w-full h-full object-cover"
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageCarousel;
