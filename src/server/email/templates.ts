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
