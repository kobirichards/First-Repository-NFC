/**
 * Structured server logging. Each entry is one JSON line on stdout/stderr, which
 * Vercel (and most hosts) collect and can forward to a log drain or an
 * error-tracking service. Never pass personal data (emails, names, message
 * bodies) or secrets in `context`: log IDs instead.
 */

type Context = Record<string, string | number | boolean | null | undefined>;

function describe(error: unknown) {
  if (error instanceof Error) {
    return {
      message: error.message,
      name: error.name,
      stack: error.stack?.split("\n").slice(0, 8).join("\n"),
      digest: "digest" in error && typeof error.digest === "string" ? error.digest : undefined,
    };
  }
  return { message: typeof error === "string" ? error : "Non-Error value thrown" };
}

function write(level: "error" | "warn" | "info", scope: string, fields: Record<string, unknown>) {
  const line = JSON.stringify({ level, scope, time: new Date().toISOString(), ...fields });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.info(line);
}

/** Logs an unexpected failure. */
export function logError(scope: string, error: unknown, context?: Context) {
  write("error", scope, { ...describe(error), ...context });
}

/** Logs something worth investigating that didn't fail the request. */
export function logWarn(scope: string, message: string, context?: Context) {
  write("warn", scope, { message, ...context });
}
