import Link from "next/link";
import { Suspense } from "react";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { AccountLink } from "./account-link";
import { Logo } from "./logo";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/teams", label: "For teams" },
  { href: "/#how-it-works", label: "How it works" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-stone bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-sheet focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Container className="flex h-16 items-center justify-between gap-6">
        <Link href="/" aria-label="Home">
          <Logo />
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink/80 hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Suspense fallback={<span className="w-16" aria-hidden="true" />}>
            <AccountLink />
          </Suspense>
          <ButtonLink href="/shop" className="hidden sm:inline-flex">
            Order cards
          </ButtonLink>
        </div>
      </Container>
    </header>
  );
}
