import {
  IMAGE_PIPELINE_LIMITS,
  emitPipelineHook,
} from "./imagePipelineConfig";

const HEADER_BYTES = 16;

export type DetectedImageFormat = "jpeg" | "png" | "webp" | "gif" | "heic" | "unknown";

export type ImageValidationCode =
  | "file_too_large"
  | "unsupported_format"
  | "corrupt_image"
  | "mime_mismatch"
  | "dimensions_exceeded"
  | "decode_failed";

export class ImageValidationError extends Error {
  readonly code: ImageValidationCode;

  constructor(code: ImageValidationCode, message: string) {
    super(message);
    this.name = "ImageValidationError";
    this.code = code;
  }
}

export interface ValidatedImage {
  ok: true;
  file: File;
  format: DetectedImageFormat;
  width: number;
  height: number;
  longestSide: number;
  megapixels: number;
  isLowQuality: boolean;
}

export interface ImageValidationFailure {
  ok: false;
  code: ImageValidationCode;
  message: string;
}

export type ImageValidationResult = ValidatedImage | ImageValidationFailure;

const FORMAT_MIME: Record<DetectedImageFormat, string | null> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  heic: "image/heic",
  unknown: null,
};

const SUPPORTED_FORMATS = new Set<DetectedImageFormat>([
  "jpeg",
  "png",
  "webp",
  "gif",
  "heic",
]);

/** Read file header without loading the full image. */
export async function readFileHeader(file: File, length = HEADER_BYTES): Promise<Uint8Array> {
  const slice = file.slice(0, length);
  const buffer = await slice.arrayBuffer();
  return new Uint8Array(buffer);
}

function bytesMatch(buf: Uint8Array, offset: number, pattern: number[]): boolean {
  if (buf.length < offset + pattern.length) return false;
  return pattern.every((b, i) => buf[offset + i] === b);
}

function readAscii(buf: Uint8Array, offset: number, length: number): string {
  return String.fromCharCode(...buf.slice(offset, offset + length));
}

/** Detect format from magic bytes — never trust extension alone. */
export function detectImageFormat(header: Uint8Array): DetectedImageFormat {
  if (bytesMatch(header, 0, [0xff, 0xd8, 0xff])) return "jpeg";
  if (bytesMatch(header, 0, [0x89, 0x50, 0x4e, 0x47])) return "png";
  if (bytesMatch(header, 0, [0x47, 0x49, 0x46, 0x38])) return "gif";
  if (
    bytesMatch(header, 0, [0x52, 0x49, 0x46, 0x46]) &&
    header.length >= 12 &&
    readAscii(header, 8, 4) === "WEBP"
  ) {
    return "webp";
  }

  if (header.length >= 12 && readAscii(header, 4, 4) === "ftyp") {
    const brand = readAscii(header, 8, 4).toLowerCase();
    if (
      brand.startsWith("hei") ||
      brand === "mif1" ||
      brand === "msf1" ||
      brand === "hevc" ||
      brand === "hevx"
    ) {
      return "heic";
    }
  }

  return "unknown";
}

function mimeMatchesFormat(mime: string, format: DetectedImageFormat): boolean {
  const normalized = mime.toLowerCase().split(";")[0].trim();
  if (!normalized) return true;
  const expected = FORMAT_MIME[format];
  if (!expected) return false;
  if (normalized === expected) return true;
  if (format === "heic" && (normalized === "image/heif" || normalized === "image/heic-sequence")) {
    return true;
  }
  if (format === "jpeg" && normalized === "image/jpg") return true;
  return false;
}

function checkDimensionLimits(width: number, height: number): ImageValidationFailure | null {
  const longestSide = Math.max(width, height);
  const megapixels = width * height;

  if (longestSide > IMAGE_PIPELINE_LIMITS.maxLongestSide) {
    return {
      ok: false,
      code: "dimensions_exceeded",
      message: "Image dimensions are too large.",
    };
  }
  if (megapixels > IMAGE_PIPELINE_LIMITS.maxMegapixels) {
    return {
      ok: false,
      code: "dimensions_exceeded",
      message: "Image resolution is too high.",
    };
  }
  return null;
}

export function validateImageHeader(
  file: File,
  header: Uint8Array,
): ImageValidationFailure | null {
  if (file.size > IMAGE_PIPELINE_LIMITS.maxUploadBytes) {
    return {
      ok: false,
      code: "file_too_large",
      message: "Image file is too large (max 10 MB).",
    };
  }

  const format = detectImageFormat(header);
  if (!SUPPORTED_FORMATS.has(format)) {
    return {
      ok: false,
      code: "unsupported_format",
      message: "Unsupported image format.",
    };
  }

  if (file.type && !mimeMatchesFormat(file.type, format)) {
    return {
      ok: false,
      code: "mime_mismatch",
      message: "Image file type does not match its contents.",
    };
  }

  return null;
}

/**
 * Full validation: size, magic bytes, MIME, decode, dimensions.
 * HEIC/HEIF is accepted when the browser can decode it.
 */
export async function validateImageFile(
  file: File,
  decode: (file: File) => Promise<{ width: number; height: number }>,
): Promise<ImageValidationResult> {
  emitPipelineHook({ stage: "validate", fileName: file.name });

  if (!file || file.size === 0) {
    return { ok: false, code: "corrupt_image", message: "Image file is empty." };
  }

  let header: Uint8Array;
  try {
    header = await readFileHeader(file);
  } catch {
    return { ok: false, code: "corrupt_image", message: "Could not read image file." };
  }

  const headerError = validateImageHeader(file, header);
  if (headerError) return headerError;

  const format = detectImageFormat(header);

  let width: number;
  let height: number;
  try {
    emitPipelineHook({ stage: "decode", fileName: file.name });
    ({ width, height } = await decode(file));
  } catch {
    if (format === "heic") {
      return {
        ok: false,
        code: "unsupported_format",
        message: "HEIC photos are not supported in this browser. Try JPEG or PNG.",
      };
    }
    return { ok: false, code: "decode_failed", message: "Could not open image file." };
  }

  if (!width || !height) {
    return { ok: false, code: "corrupt_image", message: "Image has invalid dimensions." };
  }

  const dimensionError = checkDimensionLimits(width, height);
  if (dimensionError) return dimensionError;

  const longestSide = Math.max(width, height);

  return {
    ok: true,
    file,
    format,
    width,
    height,
    longestSide,
    megapixels: width * height,
    isLowQuality: longestSide < IMAGE_PIPELINE_LIMITS.lowQualityLongestSide,
  };
}

export function contentTypeForFormat(format: DetectedImageFormat): string {
  return FORMAT_MIME[format] ?? "image/jpeg";
}
