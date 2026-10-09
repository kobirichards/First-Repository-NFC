import "server-only";
import QRCode from "qrcode";

const options = { errorCorrectionLevel: "M" as const, margin: 2, color: { dark: "#14231e", light: "#ffffff" } };

export function qrSvg(text: string): Promise<string> {
  return QRCode.toString(text, { ...options, type: "svg" });
}

export function qrPng(text: string, width = 1024): Promise<Buffer> {
  return QRCode.toBuffer(text, { ...options, type: "png", width });
}
