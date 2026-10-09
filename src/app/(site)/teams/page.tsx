import type { Metadata } from "next";
import { EnquiryForm } from "@/components/shop/enquiry-form";
import { Container } from "@/components/ui/container";
import { brand } from "@/config/brand";

export const metadata: Metadata = {
  title: "Cards for teams",
  description: `NFC business cards for sales teams, conference stands and whole companies. Request a quote from ${brand.name}.`,
};

const points = [
  { title: "Consistent branding", body: "Your logo and colours on every card, approved by you from a proof before anything is printed." },
  { title: "Ready for the event", body: "Tell us your date. We'll confirm whether we can meet it before you commit." },
  { title: "No reprinting when people move roles", body: "Each person updates their own profile, so job changes don't mean new cards." },
];

export default function TeamsPage() {
  return (
    <Container className="grid gap-14 py-14 lg:grid-cols-[1fr_1.1fr]">
      <div>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Cards for your whole team</h1>
        <p className="measure mt-4 text-lg leading-relaxed text-moss">
          Ordering for a sales team, a conference stand or a whole company? Tell us what you need and we&apos;ll send a quote,
          usually within one working day.
        </p>
        <dl className="mt-10 space-y-6">
          {points.map((p) => (
            <div key={p.title} className="border-l-2 border-brass pl-4">
              <dt className="font-semibold">{p.title}</dt>
              <dd className="mt-1 leading-relaxed text-moss">{p.body}</dd>
            </div>
          ))}
        </dl>
      </div>
      <div className="rounded-card border border-stone bg-sheet p-6 sm:p-8">
        <h2 className="mb-6 text-xl font-semibold">Request a quote</h2>
        <EnquiryForm />
      </div>
    </Container>
  );
}
