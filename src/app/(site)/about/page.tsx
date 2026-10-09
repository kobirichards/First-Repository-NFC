import type { Metadata } from "next";
import { Prose } from "@/components/content/prose";
import { ButtonLink } from "@/components/ui/button";
import { brand } from "@/config/brand";

export const metadata: Metadata = { title: "About", description: `Why ${brand.name} makes NFC business cards, and how they work.` };

export default function AboutPage() {
  return (
    <Prose
      title={`About ${brand.name}`}
      intro="Paper business cards go out of date the day you change jobs, and most end up in a drawer. We make one card that stays right."
    >
      <h2>What we make</h2>
      <p>
        Each {brand.name} card holds a short, permanent web link on an NFC chip, plus the same link as a QR code. Tapping or scanning
        it opens a profile you control. Change your role, phone number or LinkedIn whenever you like, and the card keeps up without
        being reprinted.
      </p>
      <h2>What we don&apos;t do</h2>
      <ul>
        <li>We don&apos;t put your personal details on the chip. It only holds a link.</li>
        <li>We don&apos;t track the people who tap your card, and we don&apos;t set cookies on your public profile.</li>
        <li>We never ask for your LinkedIn password, and we&apos;re not affiliated with LinkedIn.</li>
      </ul>
      <h2>Who we are</h2>
      <p>
        {brand.legalEntity}. Company details, registered address and the team will go here before launch.
      </p>
      <div className="mt-8 flex flex-wrap gap-3">
        <ButtonLink href="/shop">See the cards</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Contact us
        </ButtonLink>
      </div>
    </Prose>
  );
}
