import Link from "next/link";
import { Suspense } from "react";
import { buttonClass } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { AccountLink } from "./account-link";
import { Logo } from "./logo";
import { ShopControls } from "./shop-controls";

const nav = [
  { href: "/shop", label: "Shop" },
  { href: "/teams", label: "For teams" },
  { href: "/#how-it-works", label: "How it works" },
];

export function SiteHeader() {
  return (
    <header className="relative border-b border-stone bg-paper/90 backdrop-blur supports-[backdrop-filter]:bg-paper/75">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-sheet focus:px-4 focus:py-2"
      >
        Skip to content
      </a>
      <Container className="flex h-16 items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Small screens: a no-JavaScript disclosure menu. */}
          <details className="group md:hidden">
            <summary className="flex h-9 cursor-pointer list-none items-center rounded-control border border-ink/15 px-2.5 text-sm font-semibold marker:hidden">
              Menu
            </summary>
            <nav aria-label="Main" className="absolute inset-x-0 top-16 z-40 border-b border-stone bg-paper px-4 pb-4 shadow-card">
              <ul className="flex flex-col">
                {[...nav, { href: "/dashboard", label: "Your account" }].map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} className="block border-b border-stone py-3 font-medium">
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </details>
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
        </div>
        <nav aria-label="Main" className="hidden items-center gap-7 text-sm font-medium md:flex">
          {nav.map((item) => (
            <Link key={item.href} href={item.href} className="text-ink/80 hover:text-ink">
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-4">
          <Suspense fallback={<span className="w-32" aria-hidden="true" />}>
            <ShopControls />
          </Suspense>
          <span className="hidden whitespace-nowrap md:inline">
            <Suspense fallback={<span className="w-16" aria-hidden="true" />}>
              <AccountLink />
            </Suspense>
          </span>
          <span className="hidden lg:inline">
            <Link href="/shop" className={buttonClass("primary")}>
              Order cards
            </Link>
          </span>
        </div>
      </Container>
    </header>
  );
}
