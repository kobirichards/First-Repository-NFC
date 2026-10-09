import type { Metadata } from "next";
import Link from "next/link";
import { ContactForm } from "@/components/content/contact-form";
import { Container } from "@/components/ui/container";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Contact", description: `Get in touch with ${brand.name}.` };

export default function ContactPage() {
  return (
    <Container className="grid gap-12 py-14 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Contact us</h1>
        <p className="measure mt-4 text-lg leading-relaxed text-moss">
          Questions about an order, a card that won&apos;t activate, or anything else. We reply within one working day.
        </p>
        <dl className="mt-8 space-y-4 text-sm">
          <div>
            <dt className="font-semibold">Email</dt>
            <dd>
              <a href={`mailto:${brand.supportEmail}`} className="text-bottle underline-offset-4 hover:underline">
                {brand.supportEmail}
              </a>
            </dd>
          </div>
          <div>
            <dt className="font-semibold">Ordering for a team?</dt>
            <dd>
              <Link href="/teams" className="text-bottle underline-offset-4 hover:underline">
                Request a team quote
              </Link>
            </dd>
          </div>
        </dl>
      </div>
      <div className="rounded-card border border-stone bg-sheet p-6 sm:p-8">
        <ContactForm />
      </div>
    </Container>
  );
}
