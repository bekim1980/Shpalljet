import { useState, useMemo } from "react";
import { buildProductImageSrcSet, productImageSizes } from "@/lib/productImage";

interface SafeImageProps {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  loading?: "eager" | "lazy";
  /** Responsive srcset for pipeline images (listing + large). */
  responsive?: boolean;
  sizesAttr?: string;
}

const SafeImage = ({
  src,
  alt,
  className,
  onClick,
  loading = "lazy",
  responsive = true,
  sizesAttr,
}: SafeImageProps) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const srcSet = useMemo(
    () => (responsive ? buildProductImageSrcSet(src) : undefined),
    [responsive, src],
  );

  if (error) {
    return (
      <div
        className={`bg-secondary/30 flex items-center justify-center ${className}`}
        onClick={onClick}
      >
        <span className="text-muted-foreground/40 text-sm">Image unavailable</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`} onClick={onClick}>
      {!loaded && <div className="absolute inset-0 bg-muted animate-pulse" />}
      <img
        src={src}
        srcSet={srcSet}
        sizes={srcSet ? (sizesAttr ?? productImageSizes("1280px")) : undefined}
        alt={alt ?? ""}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading={loading}
        decoding="async"
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
};

export default SafeImage;
