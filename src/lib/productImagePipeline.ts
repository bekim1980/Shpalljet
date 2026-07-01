/**
 * Client-side product image encoding: EXIF-aware resize, metadata strip, multi-variant output.
 * Yields to the main thread between steps to avoid blocking UI on mobile.
 */
import {
  ENCODE_RETRIES,
  IMAGE_QUALITY,
  IMAGE_VARIANT_MAX,
  emitPipelineHook,
  type EncodedVariantName,
} from "./imagePipelineConfig";
import {
  validateImageFile,
  ImageValidationError,
  type ValidatedImage,
} from "./imageValidation";

export {
  IMAGE_VARIANT_MAX,
  IMAGE_QUALITY,
  type EncodedVariantName,
  type ProductImageVariant,
} from "./imagePipelineConfig";

export const LOW_QUALITY_THRESHOLD_PX = 500;
export const AI_JPEG_QUALITY = IMAGE_QUALITY.jpeg;
export const WEBP_QUALITY = IMAGE_QUALITY.webp;

export interface EncodedProductImage {
  longestSide: number;
  isLowQuality: boolean;
  useWebp: boolean;
  variants: Record<EncodedVariantName, Blob>;
}

let webpSupported: boolean | null = null;

/** Yield to the browser so encoding does not freeze the UI. */
export function yieldToMain(): Promise<void> {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame === "function") {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });
}

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
      IMAGE_QUALITY.webp,
    );
  });
}

export async function loadOrientedBitmap(file: File): Promise<ImageBitmap> {
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // Fall through to Image() loader (HEIC / older browsers).
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

export async function decodeImageDimensions(
  file: File,
): Promise<{ width: number; height: number }> {
  const bitmap = await loadOrientedBitmap(file);
  const dims = { width: bitmap.width, height: bitmap.height };
  bitmap.close();
  return dims;
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

export async function validateProductImage(file: File): Promise<ValidatedImage> {
  const result = await validateImageFile(file, decodeImageDimensions);
  if (result.ok === false) {
    throw new ImageValidationError(result.code, result.message);
  }
  return result;
}

export async function inspectImageQuality(
  file: File,
): Promise<{ longestSide: number; isLowQuality: boolean }> {
  try {
    const validated = await validateProductImage(file);
    return {
      longestSide: validated.longestSide,
      isLowQuality: validated.isLowQuality,
    };
  } catch {
    const bitmap = await loadOrientedBitmap(file);
    const longestSide = Math.max(bitmap.width, bitmap.height);
    bitmap.close();
    return {
      longestSide,
      isLowQuality: longestSide < LOW_QUALITY_THRESHOLD_PX,
    };
  }
}

const VARIANT_ENCODE_ORDER: EncodedVariantName[] = [
  "thumb",
  "card",
  "listing",
  "large",
  "ai",
];

/** Encode all storage + AI variants. Sequential with yields — memory efficient, non-blocking. */
export async function encodeProductImageVariants(file: File): Promise<EncodedProductImage> {
  emitPipelineHook({ stage: "encode", fileName: file.name });

  const bitmap = await loadOrientedBitmap(file);
  const longestSide = Math.max(bitmap.width, bitmap.height);
  const useWebp = await supportsWebP();
  const displayMime = useWebp ? "image/webp" : "image/jpeg";
  const displayQuality = useWebp ? IMAGE_QUALITY.webp : IMAGE_QUALITY.jpeg;

  const variants = {} as Record<EncodedVariantName, Blob>;

  try {
    for (const name of VARIANT_ENCODE_ORDER) {
      await yieldToMain();
      const max = IMAGE_VARIANT_MAX[name];
      const mime = name === "ai" ? "image/jpeg" : displayMime;
      const quality = name === "ai" ? IMAGE_QUALITY.jpeg : displayQuality;
      variants[name] = await bitmapToBlob(bitmap, max, mime, quality);
    }

    return {
      longestSide,
      isLowQuality: longestSide < LOW_QUALITY_THRESHOLD_PX,
      useWebp,
      variants,
    };
  } finally {
    bitmap.close();
  }
}

/** Single-pass legacy JPEG (1920px max) when multi-variant optimization fails. */
export async function encodeLegacyListingJpeg(file: File): Promise<Blob> {
  const bitmap = await loadOrientedBitmap(file);
  try {
    return await bitmapToBlob(bitmap, IMAGE_VARIANT_MAX.large, "image/jpeg", IMAGE_QUALITY.jpeg);
  } finally {
    bitmap.close();
  }
}

/** Last-resort AI JPEG at 1280px when primary AI encode fails. */
export async function encodeLegacyAiJpeg(file: File): Promise<Blob> {
  const bitmap = await loadOrientedBitmap(file);
  try {
    return await bitmapToBlob(bitmap, IMAGE_VARIANT_MAX.ai, "image/jpeg", IMAGE_QUALITY.jpeg);
  } finally {
    bitmap.close();
  }
}

/** AI variant (1280px JPEG @ 82%) — never send originals to Gemini. */
export async function encodeImageForAi(file: File): Promise<Blob> {
  emitPipelineHook({ stage: "ai", fileName: file.name });
  const bitmap = await loadOrientedBitmap(file);
  try {
    return await bitmapToBlob(bitmap, IMAGE_VARIANT_MAX.ai, "image/jpeg", IMAGE_QUALITY.jpeg);
  } finally {
    bitmap.close();
  }
}

/** Encode with one retry — used before legacy fallback upload. */
export async function encodeProductImageVariantsWithRetry(
  file: File,
): Promise<EncodedProductImage> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= ENCODE_RETRIES; attempt++) {
    try {
      if (attempt > 0) await yieldToMain();
      return await encodeProductImageVariants(file);
    } catch (err) {
      lastError = err;
      console.warn(`Image encode attempt ${attempt + 1} failed`, err);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("Image encoding failed");
}

export function getVariantExtension(useWebp: boolean, variant: EncodedVariantName): string {
  if (variant === "ai") return "jpg";
  return useWebp ? "webp" : "jpg";
}

export function getVariantContentType(useWebp: boolean, variant: EncodedVariantName): string {
  if (variant === "ai") return "image/jpeg";
  return useWebp ? "image/webp" : "image/jpeg";
}
