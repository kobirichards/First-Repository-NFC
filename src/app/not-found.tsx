import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/logo";
import { ButtonLink } from "@/components/ui/button";

export const metadata: Metadata = { title: "Page not found", robots: { index: false } };

/** Also served (with a real 404 status) for unknown or unpublished profiles: see src/proxy.ts. */
export default function NotFound() {
  return (
    <main id="main" className="mx-auto w-full max-w-md flex-1 px-4 pt-10">
      <Link href="/" aria-label="Home">
        <Logo />
      </Link>
      <h1 className="mt-16 text-2xl font-bold tracking-tight">Page not found</h1>
      <p className="mt-3 leading-relaxed text-moss">
        This page doesn&apos;t exist. If you were looking for someone&apos;s profile, they may have taken it offline or changed its
        address.
      </p>
      <div className="mt-8">
        <ButtonLink href="/" variant="secondary">
          Go to the home page
        </ButtonLink>
      </div>
    </main>
  );
}
