/** vCard 3.0 builder (widest support across iOS, Android and Outlook). Only pass public fields. */

/** RFC 6350 §3.4 text escaping, plus stripping control characters that could inject new properties. */
export function escapeVCardText(value: string): string {
  return value
    .replace(/[\u0000-\u0008\u000B-\u001F\u007F]/g, "")
    .replace(/\\/g, "\\\\")
    .replace(/\r\n|\r|\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\;");
}

/** Folds lines longer than 75 octets, as the spec requires. */
function fold(line: string): string {
  const bytes = Buffer.from(line, "utf8");
  if (bytes.length <= 75) return line;
  const parts: string[] = [];
  let current = "";
  for (const char of line) {
    if (Buffer.byteLength(current + char, "utf8") > (parts.length === 0 ? 75 : 74)) {
      parts.push(current);
      current = "";
    }
    current += char;
  }
  parts.push(current);
  return parts.join("\r\n ");
}

export type VCardInput = {
  displayName: string;
  jobTitle?: string | null;
  company?: string | null;
  email?: string | null;
  phone?: string | null;
  website?: string | null;
  linkedinUrl?: string | null;
  profileUrl: string;
  note?: string | null;
  photo?: { base64: string; type: "JPEG" | "PNG" } | null;
};

export function buildVCard(input: VCardInput): string {
  const name = input.displayName.trim();
  const parts = name.split(/\s+/);
  const family = parts.length > 1 ? parts[parts.length - 1] : "";
  const given = parts.length > 1 ? parts.slice(0, -1).join(" ") : name;

  const lines = ["BEGIN:VCARD", "VERSION:3.0", `N:${escapeVCardText(family)};${escapeVCardText(given)};;;`, `FN:${escapeVCardText(name)}`];
  if (input.company) lines.push(`ORG:${escapeVCardText(input.company)}`);
  if (input.jobTitle) lines.push(`TITLE:${escapeVCardText(input.jobTitle)}`);
  if (input.email) lines.push(`EMAIL;TYPE=INTERNET,WORK:${escapeVCardText(input.email)}`);
  if (input.phone) lines.push(`TEL;TYPE=WORK,VOICE:${escapeVCardText(input.phone)}`);
  if (input.website) lines.push(`URL;TYPE=WORK:${escapeVCardText(input.website)}`);
  if (input.linkedinUrl) lines.push(`X-SOCIALPROFILE;TYPE=linkedin:${escapeVCardText(input.linkedinUrl)}`);
  lines.push(`URL:${escapeVCardText(input.profileUrl)}`);
  if (input.note) lines.push(`NOTE:${escapeVCardText(input.note)}`);
  if (input.photo) lines.push(`PHOTO;ENCODING=b;TYPE=${input.photo.type}:${input.photo.base64}`);
  lines.push("END:VCARD");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** A safe ASCII filename for Content-Disposition. */
export function vcardFilename(displayName: string): string {
  const base = displayName
    .normalize("NFKD")
    .replace(/[^\x20-\x7E]/g, "")
    .replace(/[^A-Za-z0-9 _-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return `${base || "contact"}.vcf`;
}
