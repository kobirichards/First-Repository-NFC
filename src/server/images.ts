import "server-only";
import sharp, { type Metadata } from "sharp";

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ACCEPTED_FORMATS = new Set(["jpeg", "png", "webp"]);

export class ImageRejectedError extends Error {}

/**
 * Validates an uploaded profile photo by its actual content (not its name or
 * declared type), then re-encodes it: auto-rotates, crops to a 512px square
 * and writes a fresh WebP. Re-encoding drops all metadata, including EXIF
 * GPS location, camera details and embedded thumbnails.
 */
export async function processProfilePhoto(input: Buffer): Promise<Buffer> {
  if (input.byteLength === 0) throw new ImageRejectedError("Choose an image file.");
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageRejectedError("Images can be up to 5 MB.");

  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new ImageRejectedError("That file isn't an image we can read. Use a JPEG, PNG or WebP.");
  }
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) {
    throw new ImageRejectedError("Use a JPEG, PNG or WebP image.");
  }
  if ((metadata.pages ?? 1) > 1) throw new ImageRejectedError("Animated images aren't supported. Use a still photo.");

  return sharp(input, { limitInputPixels: 40_000_000 })
    .rotate() // apply EXIF orientation before it is discarded
    .resize(512, 512, { fit: "cover", position: "attention" })
    .webp({ quality: 82 })
    .toBuffer();
}

/**
 * Validates and re-encodes a logo/artwork upload for custom printing:
 * PNG output (keeps transparency), at most 2000px on the long edge, metadata removed.
 */
export async function processArtwork(input: Buffer): Promise<Buffer> {
  if (input.byteLength === 0) throw new ImageRejectedError("Choose an image file.");
  if (input.byteLength > MAX_UPLOAD_BYTES) throw new ImageRejectedError("Logo files can be up to 5 MB.");
  let metadata: Metadata;
  try {
    metadata = await sharp(input, { limitInputPixels: 40_000_000 }).metadata();
  } catch {
    throw new ImageRejectedError("That file isn't an image we can read. Use a PNG, JPEG or WebP.");
  }
  if (!metadata.format || !ACCEPTED_FORMATS.has(metadata.format)) throw new ImageRejectedError("Use a PNG, JPEG or WebP logo.");
  if ((metadata.width ?? 0) < 200 || (metadata.height ?? 0) < 100) {
    throw new ImageRejectedError("That logo is too small to print well. Use one at least 200 pixels wide.");
  }
  return sharp(input, { limitInputPixels: 40_000_000 })
    .rotate()
    .resize(2000, 2000, { fit: "inside", withoutEnlargement: true })
    .png()
    .toBuffer();
}
