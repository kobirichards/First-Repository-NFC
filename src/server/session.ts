import "server-only";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

/** The signed-in user, or null. Reads the request, so call it inside a Suspense boundary or a dynamic segment. */
export async function getSessionUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    role: user.role ?? "user",
    twoFactorEnabled: Boolean(user.twoFactorEnabled),
  };
}

export type SessionUser = NonNullable<Awaited<ReturnType<typeof getSessionUser>>>;

/** For dashboard pages and server actions: redirects to sign-in when there is no session. */
export async function requireUser(next?: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(next ? `/sign-in?next=${encodeURIComponent(next)}` : "/sign-in");
  return user;
}
