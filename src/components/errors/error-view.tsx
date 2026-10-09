"use client";

import Link from "next/link";
import { brand } from "@/config/brand";
import { Button, buttonClass } from "@/components/ui/button";

/**
 * Shown by the error boundaries when part of a page fails. The reference is the
 * error's digest, which also appears in the server logs, so support can find it.
 */
export function ErrorView({
  error,
  retry,
  home = { href: "/", label: "Go to the home page" },
}: {
  error: Error & { digest?: string };
  retry: () => void;
  home?: { href: string; label: string };
}) {
  return (
    <div role="alert" className="mx-auto flex w-full max-w-md flex-col py-16">
      <h1 className="text-2xl font-bold tracking-tight">This page didn&apos;t load</h1>
      <p className="mt-3 leading-relaxed text-moss">
        Something went wrong on our side. It&apos;s usually temporary, so try again in a moment.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href={home.href} className={buttonClass("secondary")}>
          {home.label}
        </Link>
      </div>
      <p className="mt-8 text-sm text-moss">
        If it keeps happening, email{" "}
        <a href={`mailto:${brand.supportEmail}`} className="underline underline-offset-4">
          {brand.supportEmail}
        </a>
        {error.digest ? (
          <>
            {" "}
            and quote reference <span className="font-mono">{error.digest}</span>
          </>
        ) : null}
        .
      </p>
    </div>
  );
}
