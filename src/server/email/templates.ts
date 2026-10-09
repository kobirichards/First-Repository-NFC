import { brand } from "@/config/brand";

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function layout(heading: string, body: string, action: { label: string; url: string }, footnote: string) {
  const url = escapeHtml(action.url);
  return `<!doctype html><html><body style="margin:0;background:#F5F6F3;font-family:Arial,Helvetica,sans-serif;color:#14231E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="left" style="padding:32px 24px">
<table role="presentation" width="100%" style="max-width:520px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:18px;font-weight:bold;padding-bottom:24px">${escapeHtml(brand.name)}</td></tr>
<tr><td style="font-size:22px;font-weight:bold;padding-bottom:12px">${escapeHtml(heading)}</td></tr>
<tr><td style="font-size:16px;line-height:1.5;padding-bottom:24px">${escapeHtml(body)}</td></tr>
<tr><td style="padding-bottom:24px"><a href="${url}" style="display:inline-block;background:#1F4D3F;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px">${escapeHtml(action.label)}</a></td></tr>
<tr><td style="font-size:13px;line-height:1.5;color:#5B6B64">${escapeHtml(footnote)}<br><br>If the button doesn't work, paste this link into your browser:<br><span style="word-break:break-all">${url}</span></td></tr>
</table></td></tr></table></body></html>`;
}

function textVersion(heading: string, body: string, url: string, footnote: string) {
  return `${heading}\n\n${body}\n\n${url}\n\n${footnote}\n\n— ${brand.name}`;
}

export function verifyEmailMessage(to: string, url: string) {
  const heading = "Confirm your email address";
  const body = `Confirm this address to finish setting up your ${brand.name} account.`;
  const footnote = "The link expires in 1 hour. If you didn't create an account, you can ignore this email.";
  return {
    to,
    tag: "verify-email",
    subject: `Confirm your email for ${brand.name}`,
    html: layout(heading, body, { label: "Confirm email", url }, footnote),
    text: textVersion(heading, body, url, footnote),
  };
}

export function resetPasswordMessage(to: string, url: string) {
  const heading = "Reset your password";
  const body = "Someone asked to reset the password for this account. Choose a new password with the link below.";
  const footnote = "The link expires in 1 hour. If you didn't ask for this, you can ignore this email; your password won't change.";
  return {
    to,
    tag: "reset-password",
    subject: `Reset your ${brand.name} password`,
    html: layout(heading, body, { label: "Choose a new password", url }, footnote),
    text: textVersion(heading, body, url, footnote),
  };
}

export function magicLinkMessage(to: string, url: string) {
  const heading = `Sign in to ${brand.name}`;
  const body = "Use this link to sign in. It works once.";
  const footnote = "The link expires in 10 minutes. If you didn't ask to sign in, you can ignore this email.";
  return {
    to,
    tag: "magic-link",
    subject: `Your ${brand.name} sign-in link`,
    html: layout(heading, body, { label: "Sign in", url }, footnote),
    text: textVersion(heading, body, url, footnote),
  };
}

export function changeEmailMessage(to: string, newEmail: string, url: string) {
  const heading = "Confirm your new email address";
  const body = `Someone asked to change the email on your ${brand.name} account to ${newEmail}. If that was you, approve the change. We'll then send a confirmation link to the new address.`;
  const footnote = "If you didn't ask for this, ignore this email and change your password.";
  return {
    to,
    tag: "change-email",
    subject: `Approve your email change on ${brand.name}`,
    html: layout(heading, body, { label: "Approve the change", url }, footnote),
    text: textVersion(heading, body, url, footnote),
  };
}

export function orderConfirmationMessage(
  to: string,
  order: {
    reference: string;
    lines: Array<{ name: string; quantity: number; amount: string }>;
    subtotal: string;
    shipping: string;
    tax: string | null;
    total: string;
    needsProof: boolean;
    ordersUrl: string | null;
  },
) {
  const heading = `Thanks for your order ${order.reference}`;
  const itemsText = order.lines.map((l) => `${l.quantity} × ${l.name}: ${l.amount}`).join("\n");
  const totalsText = [`Subtotal: ${order.subtotal}`, `Delivery: ${order.shipping}`, order.tax ? `Tax: ${order.tax}` : null, `Total paid: ${order.total}`]
    .filter(Boolean)
    .join("\n");
  const next = order.needsProof
    ? "Next, we'll email you a proof of your printed design to approve before we make your cards."
    : "We'll email you when your cards are on their way.";
  const body = `Payment received.\n\n${itemsText}\n\n${totalsText}\n\n${next}`;
  const rows = order.lines
    .map(
      (l) =>
        `<tr><td style="padding:6px 0">${escapeHtml(`${l.quantity} × ${l.name}`)}</td><td align="right" style="padding:6px 0">${escapeHtml(l.amount)}</td></tr>`,
    )
    .join("");
  const totals = [
    ["Subtotal", order.subtotal],
    ["Delivery", order.shipping],
    ...(order.tax ? [["Tax", order.tax]] : []),
    ["Total paid", order.total],
  ]
    .map(([k, v]) => `<tr><td style="padding:4px 0;color:#5B6B64">${escapeHtml(k)}</td><td align="right" style="padding:4px 0">${escapeHtml(v)}</td></tr>`)
    .join("");
  const url = order.ordersUrl ?? "";
  const html = `<!doctype html><html><body style="margin:0;background:#F5F6F3;font-family:Arial,Helvetica,sans-serif;color:#14231E">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:32px 24px">
<table role="presentation" width="100%" style="max-width:520px" cellpadding="0" cellspacing="0">
<tr><td style="font-size:18px;font-weight:bold;padding-bottom:24px">${escapeHtml(brand.name)}</td></tr>
<tr><td style="font-size:22px;font-weight:bold;padding-bottom:12px">${escapeHtml(heading)}</td></tr>
<tr><td style="font-size:16px;padding-bottom:16px">Payment received.</td></tr>
<tr><td><table role="presentation" width="100%" style="font-size:15px;border-top:1px solid #DCE1DC;border-bottom:1px solid #DCE1DC">${rows}</table></td></tr>
<tr><td><table role="presentation" width="100%" style="font-size:15px;margin-top:8px">${totals}</table></td></tr>
<tr><td style="font-size:16px;line-height:1.5;padding-top:16px">${escapeHtml(next)}</td></tr>
${url ? `<tr><td style="padding-top:24px"><a href="${escapeHtml(url)}" style="display:inline-block;background:#1F4D3F;color:#ffffff;text-decoration:none;font-weight:bold;padding:12px 20px;border-radius:6px">View your order</a></td></tr>` : ""}
</table></td></tr></table></body></html>`;
  return {
    to,
    tag: "order-confirmation",
    subject: `Order ${order.reference} confirmed`,
    html,
    text: `${heading}\n\n${body}${url ? `\n\nView your order: ${url}` : ""}\n\n— ${brand.name}`,
  };
}

export function enquiryNotificationMessage(to: string, enquiry: { company?: string | null; name: string; email: string; quantity?: number | null; message: string }) {
  const heading = "New team enquiry";
  const body = `${enquiry.name} <${enquiry.email}>${enquiry.company ? ` from ${enquiry.company}` : ""}${enquiry.quantity ? `, about ${enquiry.quantity} cards` : ""}.\n\n${enquiry.message}`;
  return {
    to,
    tag: "enquiry-notification",
    subject: `Team enquiry${enquiry.company ? `: ${enquiry.company}` : ""}`,
    html: `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#14231E"><h1 style="font-size:20px">${escapeHtml(heading)}</h1><p style="white-space:pre-line">${escapeHtml(body)}</p></body></html>`,
    text: `${heading}\n\n${body}`,
  };
}
