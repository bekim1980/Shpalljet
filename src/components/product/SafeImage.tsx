import { useState } from "react";

interface SafeImageProps {
  src: string;
  alt?: string;
  className?: string;
  onClick?: () => void;
  loading?: "eager" | "lazy";
}

const SafeImage = ({ src, alt, className, onClick, loading }: SafeImageProps) => {
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

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
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse" />
      )}
      <img
        src={src}
        alt={alt ?? ""}
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? "opacity-100" : "opacity-0"}`}
        loading={loading}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
      />
    </div>
  );
};

export default SafeImage;
