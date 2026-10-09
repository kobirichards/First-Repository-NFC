"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/components/ui/cn";

export function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const pathname = usePathname();
  const current = href === "/dashboard" ? pathname === href : pathname.startsWith(href);
  return (
    <Link
      href={href}
      aria-current={current ? "page" : undefined}
      className={cn(
        "border-b-2 py-3 whitespace-nowrap",
        current ? "border-bottle text-ink" : "border-transparent text-ink/75 hover:border-ink/30 hover:text-ink",
      )}
    >
      {children}
    </Link>
  );
}
