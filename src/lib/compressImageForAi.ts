/**
 * Resize & compress images before sending to the vision API (AI variant only).
 * Retries once; never sends unvalidated or full-resolution originals.
 */
import { ENCODE_RETRIES } from "./imagePipelineConfig";
import {
  encodeImageForAi,
  encodeLegacyAiJpeg,
  validateProductImage,
  yieldToMain,
} from "./productImagePipeline";

function blobToBase64(blob: Blob): Promise<string> {
  return blob.arrayBuffer().then((buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  });
}

async function encodeAiBlobWithRetry(file: File): Promise<Blob> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= ENCODE_RETRIES; attempt++) {
    try {
      if (attempt > 0) await yieldToMain();
      return await encodeImageForAi(file);
    } catch (err) {
      lastError = err;
      console.warn(`AI image encode attempt ${attempt + 1} failed`, err);
    }
  }

  try {
    return await encodeLegacyAiJpeg(file);
  } catch {
    throw lastError instanceof Error ? lastError : new Error("AI image encoding failed");
  }
}

export async function compressImageForAi(file: File): Promise<string> {
  await validateProductImage(file);
  const blob = await encodeAiBlobWithRetry(file);
  return blobToBase64(blob);
}

export async function filesToBase64Images(files: File[]): Promise<string[]> {
  const results: string[] = [];
  for (const file of files) {
    await yieldToMain();
    results.push(await compressImageForAi(file));
  }
  return results;
}
