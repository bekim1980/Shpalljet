import type { SupabaseClient } from "@supabase/supabase-js";
import {
  STORAGE_VARIANTS,
  emitPipelineHook,
} from "./imagePipelineConfig";
import { ImageValidationError, contentTypeForFormat } from "./imageValidation";
import {
  encodeLegacyListingJpeg,
  encodeProductImageVariantsWithRetry,
  getVariantContentType,
  getVariantExtension,
  validateProductImage,
  yieldToMain,
  type EncodedProductImage,
  type EncodedVariantName,
} from "./productImagePipeline";

export interface UploadProductImageResult {
  /** Canonical URL stored in products.image_urls (listing variant). */
  listingUrl: string;
  imageId: string;
  isLowQuality: boolean;
  /** True when multi-variant optimization was skipped. */
  usedFallback: boolean;
}

async function uploadEncodedVariants(
  supabase: SupabaseClient,
  userId: string,
  encoded: EncodedProductImage,
): Promise<UploadProductImageResult> {
  const imageId = crypto.randomUUID();
  const basePath = `${userId}/${imageId}`;

  emitPipelineHook({ stage: "upload", fileName: imageId, userId });

  const uploads = STORAGE_VARIANTS.map((variant: EncodedVariantName) => {
    const ext = getVariantExtension(encoded.useWebp, variant);
    const path = `${basePath}/${variant}.${ext}`;
    const blob = encoded.variants[variant];
    return supabase.storage.from("product-images").upload(path, blob, {
      contentType: getVariantContentType(encoded.useWebp, variant),
    });
  });

  const results = await Promise.all(uploads);
  const failed = results.find((r) => r.error);
  if (failed?.error) throw failed.error;

  const listingExt = getVariantExtension(encoded.useWebp, "listing");
  const { data: urlData } = supabase.storage
    .from("product-images")
    .getPublicUrl(`${basePath}/listing.${listingExt}`);

  return {
    listingUrl: urlData.publicUrl,
    imageId,
    isLowQuality: encoded.isLowQuality,
    usedFallback: false,
  };
}

async function uploadLegacyFallback(
  supabase: SupabaseClient,
  userId: string,
  file: File,
  isLowQuality: boolean,
): Promise<UploadProductImageResult> {
  emitPipelineHook({ stage: "fallback", fileName: file.name, userId });

  const imageId = crypto.randomUUID();
  const path = `${userId}/${imageId}.jpg`;

  let blob: Blob;
  try {
    blob = await encodeLegacyListingJpeg(file);
  } catch {
    blob = file;
  }

  const contentType = blob.type?.startsWith("image/") ? blob.type : "image/jpeg";
  const { error } = await supabase.storage.from("product-images").upload(path, blob, {
    contentType,
  });
  if (error) throw error;

  const { data: urlData } = supabase.storage.from("product-images").getPublicUrl(path);

  return {
    listingUrl: urlData.publicUrl,
    imageId,
    isLowQuality,
    usedFallback: true,
  };
}

/**
 * Production upload: validate → optimize (retry once) → legacy fallback.
 * Never blocks publishing solely because optimization failed.
 */
export async function uploadProductImageWithFallback(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadProductImageResult> {
  const validated = await validateProductImage(file);

  try {
    await yieldToMain();
    const encoded = await encodeProductImageVariantsWithRetry(file);
    return await uploadEncodedVariants(supabase, userId, encoded);
  } catch (optimizeErr) {
    console.warn("Optimized upload failed, using legacy fallback", optimizeErr);
    try {
      return await uploadLegacyFallback(
        supabase,
        userId,
        validated.file,
        validated.isLowQuality,
      );
    } catch (fallbackErr) {
      console.error("Legacy fallback upload failed", fallbackErr);
      throw fallbackErr;
    }
  }
}

/** @deprecated Use uploadProductImageWithFallback */
export async function uploadProductImageSet(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadProductImageResult> {
  return uploadProductImageWithFallback(supabase, userId, file);
}

export { ImageValidationError, contentTypeForFormat };
