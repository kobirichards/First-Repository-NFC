import type { Instrumentation } from "next";

/**
 * Runs once when a server instance starts. In production it checks the
 * environment variables and refuses to start with an unsafe configuration
 * (placeholder secrets, test payments, local storage and so on).
 */
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const appEnv = process.env.APP_ENV ?? (process.env.NODE_ENV === "production" ? "production" : "development");
  if (appEnv !== "production") return;

  const { checkProductionEnv } = await import("./server/env-check");
  const { logError, logWarn } = await import("./server/log");
  const { errors, warnings } = checkProductionEnv(process.env);
  for (const warning of warnings) logWarn("env", warning);
  if (errors.length === 0) return;

  for (const error of errors) logError("env", error);
  // Hard stop only for a deployment that declares itself production. A local
  // `next start` without APP_ENV just logs, so it can still be tried out.
  const declaredProduction = process.env.APP_ENV === "production" || process.env.VERCEL_ENV === "production";
  const building = process.env.NEXT_PHASE === "phase-production-build";
  if (declaredProduction && !building) {
    throw new Error(`Refusing to start: ${errors.length} environment problem(s). See the "env" log lines above.`);
  }
}

/** Every unhandled server error (pages, route handlers, server actions, proxy) is logged once, as JSON. */
export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
  const { logError } = await import("./server/log");
  logError("request", error, {
    method: request.method,
    // Path without the query string: tokens and emails can appear in queries.
    path: request.path.split("?")[0],
    routePath: context.routePath,
    routeType: context.routeType,
  });
};
