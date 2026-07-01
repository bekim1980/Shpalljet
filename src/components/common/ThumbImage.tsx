import { useState, useEffect, useMemo } from "react";
import { buildProductImageSrcSet, productImageSizes } from "@/lib/productImage";

interface ThumbImageProps {
  src?: string | null;
  alt?: string;
  className?: string;
  loading?: "eager" | "lazy";
  /** Optional className applied to the wrapper (sizing/positioning). */
  wrapperClassName?: string;
  /** Enable responsive srcset when pipeline variants exist. */
  responsive?: boolean;
}

/**
 * Stable thumbnail image:
 * - Container always has a neutral background (no white flash).
 * - <img> is hidden (opacity-0) until it actually loads.
 * - On error (or missing src), shows a clean placeholder — never the
 *   browser's broken-image icon, and never loops onError.
 */
const ThumbImage = ({
  src,
  alt = "",
  className = "",
  loading = "lazy",
  wrapperClassName = "absolute inset-0",
  responsive = true,
}: ThumbImageProps) => {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  const srcSet = useMemo(
    () => (responsive && src ? buildProductImageSrcSet(src) : undefined),
    [responsive, src],
  );

  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  const showPlaceholder = !src?.trim() || errored;

  return (
    <div className={`${wrapperClassName} bg-secondary/40 overflow-hidden`}>
      {showPlaceholder ? (
        <div className="absolute inset-0 flex items-center justify-center bg-secondary/40">
          <img
            src="/placeholder.svg"
            alt=""
            aria-hidden="true"
            className="w-1/2 h-1/2 object-contain opacity-30"
          />
        </div>
      ) : (
        <img
          src={src}
          srcSet={srcSet}
          sizes={srcSet ? productImageSizes("320px") : undefined}
          alt={alt}
          loading={loading}
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`${className} transition-opacity duration-200 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      )}
    </div>
  );
};

export default ThumbImage;
