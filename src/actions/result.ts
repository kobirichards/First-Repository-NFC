import { ZodError } from "zod";
import { UserFacingError } from "@/server/errors";

export type ActionState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string>;
  /** Set on success; lets forms re-mount their fields to show the stored (normalised) values. */
  savedAt?: number;
};

/** Converts thrown errors into safe form state. Unknown errors are logged and replaced with a generic message. */
export function toActionError(error: unknown): ActionState {
  if (error instanceof ZodError) {
    // A single value was validated (no field path): its message is the whole story.
    if (error.issues.every((issue) => issue.path.length === 0)) return { ok: false, message: error.issues[0]?.message };
    const fieldErrors: Record<string, string> = {};
    for (const issue of error.issues) {
      const key = String(issue.path[0] ?? "form");
      fieldErrors[key] ??= issue.message;
    }
    return { ok: false, message: "Check the highlighted fields.", fieldErrors };
  }
  if (error instanceof UserFacingError) {
    return { ok: false, message: error.message, fieldErrors: error.field ? { [error.field]: error.message } : undefined };
  }
  console.error("[action] unexpected error:", error instanceof Error ? error.message : error);
  return { ok: false, message: "Something went wrong and nothing was saved. Try again." };
}
