import type { Metadata } from "next";
import { DraftBanner, Prose } from "@/components/content/prose";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "Terms" };

export default function TermsPage() {
  return (
    <>
      <DraftBanner />
      <Prose title="Terms of sale and use" updated="[date of review]">
        <p>
          These terms apply when you buy from {brand.name} or use your account and profile. [The business must replace this outline
          with reviewed terms.]
        </p>
        <h2>1. Who we are</h2>
        <p>{brand.legalEntity}. [Registered details.]</p>
        <h2>2. Your account</h2>
        <p>
          Keep your password safe. You&apos;re responsible for what you publish on your profile: it must be accurate, lawful and yours to
          share. We can remove content or suspend accounts that break these terms.
        </p>
        <h2>3. Orders and prices</h2>
        <p>
          Prices are shown before you pay, in the currency you choose. UK and EU prices include VAT. A contract is formed when we
          email your order confirmation.
        </p>
        <h2>4. Printed cards and proofs</h2>
        <p>
          You confirm you have the right to use any name, title or logo you send us. We start making printed cards only after you approve
          a proof.
        </p>
        <h2>5. Cancellations, returns and faults</h2>
        <p>
          See <a href="/shipping-returns">shipping and returns</a>. Nothing in these terms affects your statutory rights.
        </p>
        <h2>6. The card service</h2>
        <p>
          Your card links to your profile for as long as {brand.name} operates the service. [Commitment to be decided: notice period
          and data export if the service ever closes.] We aim for the service to be available at all times but can&apos;t guarantee
          it never goes down.
        </p>
        <h2>7. LinkedIn</h2>
        <p>
          You can link to your LinkedIn profile. {brand.name} isn&apos;t affiliated with or endorsed by LinkedIn, and never asks for your
          LinkedIn password.
        </p>
        <h2>8. Liability</h2>
        <p>[To be drafted by a qualified professional.]</p>
        <h2>9. Law</h2>
        <p>[Governing law and jurisdiction to be confirmed. Consumers keep the protections of the country where they live.]</p>
      </Prose>
    </>
  );
}
