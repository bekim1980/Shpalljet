/** Resize & compress images before sending to the vision API (AI variant only). */
import { encodeImageForAi } from "./productImagePipeline";

export async function compressImageForAi(file: File): Promise<string> {
  const blob = await encodeImageForAi(file);
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

export async function filesToBase64Images(files: File[]): Promise<string[]> {
  return Promise.all(files.map((f) => compressImageForAi(f)));
}
