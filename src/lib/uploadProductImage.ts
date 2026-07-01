import type { SupabaseClient } from "@supabase/supabase-js";
import {
  encodeProductImageVariants,
  getVariantContentType,
  getVariantExtension,
  type EncodedVariantName,
} from "./productImagePipeline";

const STORAGE_VARIANTS: EncodedVariantName[] = ["thumb", "card", "listing", "large", "ai"];

export interface UploadProductImageResult {
  /** Canonical URL stored in products.image_urls (listing variant). */
  listingUrl: string;
  imageId: string;
  isLowQuality: boolean;
}

export async function uploadProductImageSet(
  supabase: SupabaseClient,
  userId: string,
  file: File,
): Promise<UploadProductImageResult> {
  const encoded = await encodeProductImageVariants(file);
  const imageId = crypto.randomUUID();
  const basePath = `${userId}/${imageId}`;

  const uploads = STORAGE_VARIANTS.map((variant) => {
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
  };
}
