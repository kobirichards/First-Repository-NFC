/** Turns Better Auth error responses into plain, actionable messages. */
export function authErrorMessage(error: { code?: string; status?: number; message?: string } | null | undefined): string {
  if (!error) return "Something went wrong. Try again.";
  if (error.status === 429) return "Too many attempts. Wait a few minutes, then try again.";
  switch (error.code) {
    case "INVALID_EMAIL_OR_PASSWORD":
      return "That email and password don't match an account. Check them and try again, or reset your password.";
    case "EMAIL_NOT_VERIFIED":
      return "Confirm your email address first. We've sent you a new confirmation link.";
    case "PASSWORD_TOO_SHORT":
      return "Use at least 10 characters for your password.";
    case "PASSWORD_TOO_LONG":
      return "Use no more than 128 characters for your password.";
    case "INVALID_EMAIL":
      return "Enter a valid email address.";
    case "INVALID_TOKEN":
      return "This link has expired or has already been used. Request a new one.";
    case "USER_ALREADY_EXISTS":
    case "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL":
      return "An account with this email already exists. Sign in instead.";
    default:
      return "Something went wrong. Try again.";
  }
}
