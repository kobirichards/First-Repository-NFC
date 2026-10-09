import "server-only";
import { notFound, redirect } from "next/navigation";
import { getSessionUser, type SessionUser } from "../session";

export class ForbiddenError extends Error {
  constructor() {
    super("Forbidden");
    this.name = "ForbiddenError";
  }
}

export type AdminActor = Pick<SessionUser, "id" | "role" | "twoFactorEnabled">;

/**
 * The single authorization rule for admin work: role "admin" AND two-step
 * verification turned on. Every function in src/server/admin calls this
 * first, whatever page, action or route it was reached from.
 */
export function assertAdmin(actor: AdminActor | null | undefined): asserts actor is AdminActor {
  if (!actor || actor.role !== "admin" || !actor.twoFactorEnabled) throw new ForbiddenError();
}

/**
 * For admin pages and server actions. Signed-out visitors go to sign-in;
 * signed-in non-admins get a 404, so the admin area's existence isn't
 * confirmed; admins without two-step verification are sent to set it up.
 */
export async function requireAdmin(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=%2Fadmin");
  if (user.role !== "admin") notFound();
  if (!user.twoFactorEnabled) redirect("/admin/setup-mfa");
  return user;
}

/** Only for the MFA enrolment page: an admin who hasn't set up two-step verification yet. */
export async function requireAdminPendingMfa(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in?next=%2Fadmin");
  if (user.role !== "admin") notFound();
  return user;
}
