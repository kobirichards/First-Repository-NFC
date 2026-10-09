/** Shown when a server action never answers (offline, timeout, deploy in progress). */
export const CONNECTION_ERROR = "We couldn't reach the server, so nothing was saved. Check your connection and try again.";

/**
 * Runs a server action from an event handler and turns a failed request into
 * an ordinary error result, so the page shows a message instead of breaking.
 */
export async function callAction<T extends { ok?: boolean; message?: string }>(
  run: () => Promise<T>,
): Promise<T | { ok: false; message: string }> {
  try {
    return await run();
  } catch {
    return { ok: false, message: CONNECTION_ERROR };
  }
}
