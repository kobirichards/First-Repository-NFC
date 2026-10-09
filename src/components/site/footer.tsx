import Link from "next/link";
import { brand } from "@/config/brand";
import { Container } from "@/components/ui/container";
import { Logo } from "./logo";

const groups = [
  {
    title: "Product",
    links: [
      { href: "/shop", label: "Shop" },
      { href: "/teams", label: "For teams" },
      { href: "/#faq", label: "Questions" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact" },
      { href: "/shipping-returns", label: "Shipping and returns" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/privacy", label: "Privacy" },
      { href: "/terms", label: "Terms" },
      { href: "/cookies", label: "Cookies" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-stone bg-sheet">
      <Container className="grid gap-10 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div className="max-w-xs">
          <Logo />
          <p className="mt-3 text-sm leading-relaxed text-moss">{brand.description}</p>
        </div>
        {groups.map((group) => (
          <nav key={group.title} aria-label={group.title}>
            <h2 className="text-sm font-semibold">{group.title}</h2>
            <ul className="mt-3 space-y-2 text-sm">
              {group.links.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-moss hover:text-ink">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        ))}
      </Container>
      <Container className="pb-8 text-xs text-moss">
        <p className="border-t border-stone pt-6">
          {brand.legalEntity}. LinkedIn is a trademark of LinkedIn Corporation. {brand.name} is not affiliated with or
          endorsed by LinkedIn.
        </p>
      </Container>
    </footer>
  );
}
