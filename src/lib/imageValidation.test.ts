import { describe, expect, it } from "vitest";
import {
  detectImageFormat,
  validateImageHeader,
} from "@/lib/imageValidation";
import { IMAGE_PIPELINE_LIMITS, IMAGE_QUALITY } from "@/lib/imagePipelineConfig";

function headerBytes(values: number[]): Uint8Array {
  return new Uint8Array(values);
}

describe("detectImageFormat", () => {
  it("detects JPEG from magic bytes", () => {
    expect(detectImageFormat(headerBytes([0xff, 0xd8, 0xff, 0xe0]))).toBe("jpeg");
  });

  it("detects PNG from magic bytes", () => {
    expect(detectImageFormat(headerBytes([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]))).toBe("png");
  });

  it("detects WebP from RIFF/WEBP", () => {
    const h = new Uint8Array(12);
    h.set([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0]);
    h.set([0x57, 0x45, 0x42, 0x50], 8);
    expect(detectImageFormat(h)).toBe("webp");
  });

  it("detects HEIC from ftyp brand", () => {
    const h = new Uint8Array(16);
    h.set([0, 0, 0, 0x18, 0x66, 0x74, 0x79, 0x70]);
    h.set([0x68, 0x65, 0x69, 0x63], 8);
    expect(detectImageFormat(h)).toBe("heic");
  });

  it("returns unknown for non-images", () => {
    expect(detectImageFormat(headerBytes([0x00, 0x01, 0x02]))).toBe("unknown");
  });
});

describe("validateImageHeader", () => {
  it("rejects files over the safety limit", () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "big.jpg", {
      type: "image/jpeg",
    });
    Object.defineProperty(file, "size", { value: IMAGE_PIPELINE_LIMITS.maxUploadBytes + 1 });

    const err = validateImageHeader(file, new Uint8Array([0xff, 0xd8, 0xff]));
    expect(err?.code).toBe("file_too_large");
  });

  it("rejects unsupported magic bytes", () => {
    const file = new File([new Uint8Array(4)], "x.bin", { type: "application/octet-stream" });
    const err = validateImageHeader(file, headerBytes([0x00, 0x01, 0x02, 0x03]));
    expect(err?.code).toBe("unsupported_format");
  });

  it("rejects MIME mismatch", () => {
    const file = new File([new Uint8Array([0xff, 0xd8, 0xff])], "fake.png", {
      type: "image/png",
    });
    const err = validateImageHeader(file, new Uint8Array([0xff, 0xd8, 0xff]));
    expect(err?.code).toBe("mime_mismatch");
  });
});

describe("IMAGE_QUALITY", () => {
  it("stays within the 80–85% target band", () => {
    expect(IMAGE_QUALITY.jpeg).toBeGreaterThanOrEqual(0.8);
    expect(IMAGE_QUALITY.jpeg).toBeLessThanOrEqual(0.85);
    expect(IMAGE_QUALITY.webp).toBeGreaterThanOrEqual(0.8);
    expect(IMAGE_QUALITY.webp).toBeLessThanOrEqual(0.85);
  });
});
