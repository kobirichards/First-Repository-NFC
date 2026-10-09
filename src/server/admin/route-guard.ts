import "server-only";
import { getSessionUser } from "../session";
import type { AdminActor } from "./guard";

/** For admin route handlers (file downloads): the actor if they're an MFA-verified admin, else null → respond 404. */
export async function adminActorOrNull(): Promise<AdminActor | null> {
  const user = await getSessionUser();
  return user && user.role === "admin" && user.twoFactorEnabled ? user : null;
}
