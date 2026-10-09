import "server-only";
import { env } from "@/config/env";

/** The permanent URL written to a card's chip and printed as its QR code. */
export function cardUrl(token: string): string {
  return `${env.cardDomain}/c/${token}`;
}

export function profileUrl(slug: string): string {
  return `${env.appUrl}/p/${slug}`;
}

export function photoUrl(photoKey: string): string {
  return `/media/${photoKey}`;
}
