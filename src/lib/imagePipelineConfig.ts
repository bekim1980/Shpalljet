/**
 * Central image pipeline configuration.
 * Extend here for AVIF, CDN transforms, watermarking, moderation hooks, etc.
 */

export const IMAGE_PIPELINE_LIMITS = {
  /** Matches Supabase product-images bucket limit. */
  maxUploadBytes: 10 * 1024 * 1024,
  /** Reject decompression bombs / absurd dimensions. */
  maxMegapixels: 36_000_000,
  maxLongestSide: 16_384,
  lowQualityLongestSide: 500,
} as const;

/** Target visual quality band: 80–85%. */
export const IMAGE_QUALITY = {
  jpeg: 0.82,
  webp: 0.82,
  /** Reserved for future AVIF encoder plugin. */
  avif: 0.8,
} as const;

export const IMAGE_VARIANT_MAX = {
  thumb: 320,
  card: 640,
  listing: 1280,
  large: 1920,
  ai: 1280,
} as const;

export type ProductImageVariant = keyof typeof IMAGE_VARIANT_MAX;

export type EncodedVariantName = "thumb" | "card" | "listing" | "large" | "ai";

/** Display variants (extensible: add avif alongside webp). */
export const DISPLAY_VARIANTS: EncodedVariantName[] = [
  "thumb",
  "card",
  "listing",
  "large",
];

export const STORAGE_VARIANTS: EncodedVariantName[] = [...DISPLAY_VARIANTS, "ai"];

/** Optimization encode attempts before legacy fallback (total tries = 1 + retries). */
export const ENCODE_RETRIES = 1;

export type ImagePipelineStage =
  | "validate"
  | "decode"
  | "encode"
  | "upload"
  | "fallback"
  | "ai";

/** Hook surface for future background jobs / moderation / dedup. */
export interface ImagePipelineHookContext {
  stage: ImagePipelineStage;
  fileName: string;
  userId?: string;
}

export type ImagePipelineHook = (ctx: ImagePipelineHookContext) => void;

let pipelineHook: ImagePipelineHook | null = null;

export function setImagePipelineHook(hook: ImagePipelineHook | null): void {
  pipelineHook = hook;
}

export function emitPipelineHook(ctx: ImagePipelineHookContext): void {
  pipelineHook?.(ctx);
}
