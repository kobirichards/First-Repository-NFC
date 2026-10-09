/** Upload limits shared by the browser (early check) and the server (enforced). */
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];

/** Returns a message when the file can't be uploaded, so the browser can say so before sending it. */
export function uploadProblem(file: File): string | null {
  if (file.size > MAX_UPLOAD_BYTES) return `That file is ${(file.size / 1024 / 1024).toFixed(1)} MB. Images can be up to 5 MB.`;
  if (file.type && !ACCEPTED_IMAGE_TYPES.includes(file.type)) return "Use a JPEG, PNG or WebP image.";
  return null;
}
