/** Client-side product image encoding: EXIF-aware resize, metadata strip, multi-variant output. */

export const IMAGE_VARIANT_MAX = {
  thumb: 320,
  card: 640,
  listing: 1280,
  large: 1920,
  ai: 1280,
} as const;

export type ProductImageVariant = keyof typeof IMAGE_VARIANT_MAX;

export const LOW_QUALITY_THRESHOLD_PX = 500;

export const AI_JPEG_QUALITY = 0.82;
export const WEBP_QUALITY = 0.82;

export type EncodedVariantName = "thumb" | "card" | "listing" | "large" | "ai";

export interface EncodedProductImage {
  longestSide: number;
  isLowQuality: boolean;
  useWebp: boolean;
  variants: Record<EncodedVariantName, Blob>;
}

let webpSupported: boolean | null = null;

export async function supportsWebP(): Promise<boolean> {
  if (webpSupported !== null) return webpSupported;
  if (typeof document === "undefined") return false;

  return new Promise((resolve) => {
    const canvas = document.createElement("canvas");
    canvas.width = 1;
    canvas.height = 1;
    canvas.toBlob(
      (blob) => {
        webpSupported = blob?.type === "image/webp";
        resolve(webpSupported);
      },
      "image/webp",
      WEBP_QUALITY,
    );
  });
}

export async function loadOrientedBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to Image() loader.
    }
  }

  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Image load failed"));
      el.src = url;
    });
    if (typeof createImageBitmap === "function") {
      return await createImageBitmap(img);
    }
    throw new Error("createImageBitmap not supported");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function bitmapToBlob(
  bitmap: ImageBitmap,
  maxLongest: number,
  mimeType: string,
  quality: number,
): Promise<Blob> {
  const longest = Math.max(bitmap.width, bitmap.height);
  const scale = Math.min(1, maxLongest / longest);
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.reject(new Error("Canvas not supported"));

  ctx.drawImage(bitmap, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Image encoding failed"))),
      mimeType,
      quality,
    );
  });
}

export async function inspectImageQuality(
  file: File,
): Promise<{ longestSide: number; isLowQuality: boolean }> {
  const bitmap = await loadOrientedBitmap(file);
  const longestSide = Math.max(bitmap.width, bitmap.height);
  bitmap.close();
  return {
    longestSide,
    isLowQuality: longestSide < LOW_QUALITY_THRESHOLD_PX,
  };
}

/** Encode all storage + AI variants from one source file. Never upscales. */
export async function encodeProductImageVariants(file: File): Promise<EncodedProductImage> {
  const bitmap = await loadOrientedBitmap(file);
  const longestSide = Math.max(bitmap.width, bitmap.height);
  const useWebp = await supportsWebP();
  const displayMime = useWebp ? "image/webp" : "image/jpeg";
  const displayQuality = useWebp ? WEBP_QUALITY : AI_JPEG_QUALITY;

  try {
    const [thumb, card, listing, large, ai] = await Promise.all([
      bitmapToBlob(bitmap, IMAGE_VARIANT_MAX.thumb, displayMime, displayQuality),
      bitmapToBlob(bitmap, IMAGE_VARIANT_MAX.card, displayMime, displayQuality),
      bitmapToBlob(bitmap, IMAGE_VARIANT_MAX.listing, displayMime, displayQuality),
      bitmapToBlob(bitmap, IMAGE_VARIANT_MAX.large, displayMime, displayQuality),
      bitmapToBlob(bitmap, IMAGE_VARIANT_MAX.ai, "image/jpeg", AI_JPEG_QUALITY),
    ]);

    return {
      longestSide,
      isLowQuality: longestSide < LOW_QUALITY_THRESHOLD_PX,
      useWebp,
      variants: { thumb, card, listing, large, ai },
    };
  } finally {
    bitmap.close();
  }
}

/** AI-only variant (1280px JPEG @ 82%) — never send originals to Gemini. */
export async function encodeImageForAi(file: File): Promise<Blob> {
  const bitmap = await loadOrientedBitmap(file);
  try {
    return await bitmapToBlob(bitmap, IMAGE_VARIANT_MAX.ai, "image/jpeg", AI_JPEG_QUALITY);
  } finally {
    bitmap.close();
  }
}

export function getVariantExtension(useWebp: boolean, variant: EncodedVariantName): string {
  if (variant === "ai") return "jpg";
  return useWebp ? "webp" : "jpg";
}

export function getVariantContentType(useWebp: boolean, variant: EncodedVariantName): string {
  if (variant === "ai") return "image/jpeg";
  return useWebp ? "image/webp" : "image/jpeg";
}
