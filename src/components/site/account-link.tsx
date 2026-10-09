import Link from "next/link";
import { getSessionUser } from "@/server/session";
import { buttonClass } from "@/components/ui/button";

/** Reads the session, so it must render inside <Suspense>. */
export async function AccountLink() {
  const user = await getSessionUser();
  if (user) {
    return (
      <Link href="/dashboard" className={buttonClass("secondary")}>
        Your account
      </Link>
    );
  }
  return (
    <>
      <Link href="/sign-in" className="text-sm font-semibold text-ink hover:text-bottle">
        Sign in
      </Link>
    </>
  );
}
