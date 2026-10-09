import type { Metadata } from "next";
import Link from "next/link";
import { Logo } from "@/components/site/logo";

export const metadata: Metadata = { title: { default: "Admin", template: "%s · Admin" }, robots: { index: false, follow: false } };

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/proofs", label: "Proofs" },
  { href: "/admin/batches", label: "Card batches" },
  { href: "/admin/cards", label: "Cards" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/customers", label: "Customers" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/audit", label: "Audit log" },
];

/** Every admin page checks requireAdmin() itself; this layout only draws the chrome. */
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="bg-ink text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between gap-4 px-4 sm:px-6">
          <Link href="/admin" className="flex items-center gap-3 [&_span]:text-white">
            <Logo />
            <span className="rounded bg-white/15 px-2 py-0.5 text-xs font-semibold">Admin</span>
          </Link>
          <Link href="/dashboard" className="text-sm text-white/80 hover:text-white">
            Your account
          </Link>
        </div>
      </header>
      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-8 px-4 py-8 sm:px-6 md:grid-cols-[12rem_1fr]">
        <nav aria-label="Admin" className="text-sm">
          <ul className="flex gap-1 overflow-x-auto md:flex-col">
            {nav.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="block rounded-control px-3 py-2 whitespace-nowrap text-ink/80 hover:bg-sheet hover:text-ink">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        <main id="main" className="min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
