import Link from "next/link";
import { NavLink } from "@/components/dashboard/nav-link";
import { Logo } from "@/components/site/logo";
import { Container } from "@/components/ui/container";

const nav = [
  { href: "/dashboard", label: "Overview" },
  { href: "/dashboard/profile", label: "Profile" },
  { href: "/dashboard/cards", label: "Cards" },
  { href: "/dashboard/orders", label: "Orders" },
  { href: "/dashboard/account", label: "Account" },
];

export default function DashboardLayout({ children }: LayoutProps<"/">) {
  return (
    <>
      <header className="border-b border-stone bg-sheet">
        <Container className="flex h-16 items-center justify-between gap-6">
          <Link href="/" aria-label="Home">
            <Logo />
          </Link>
          <Link href="/" className="text-sm font-medium text-moss hover:text-ink">
            Back to the shop
          </Link>
        </Container>
        <Container>
          <nav aria-label="Account" className="-mb-px flex gap-6 overflow-x-auto text-sm font-medium">
            {nav.map((item) => (
              <NavLink key={item.href} href={item.href}>
                {item.label}
              </NavLink>
            ))}
          </nav>
        </Container>
      </header>
      <main id="main" className="flex-1">
        <Container className="py-10">{children}</Container>
      </main>
    </>
  );
}
