import { brand } from "@/config/brand";
import { ButtonLink } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { TapScene } from "@/components/home/tap-scene";

const steps = [
  {
    title: "Order your cards",
    body: "Choose a finish, and add your name and logo if you want them printed. Each card has its own permanent link stored on the chip.",
  },
  {
    title: "Set up your profile",
    body: "Add your role, company and LinkedIn, and choose exactly which details are public. Or send the card straight to LinkedIn.",
  },
  {
    title: "Tap to share",
    body: "Hold the card near someone's phone and your profile opens. No app needed. A QR code on the card covers phones without NFC.",
  },
];

const faqs = [
  {
    q: "Which phones can read the card?",
    a: "Most iPhones from the iPhone XS onwards, and most Android phones with NFC turned on, open the card without an app. For anything else, the QR code on the card goes to the same place.",
  },
  {
    q: "What's stored on the chip?",
    a: `Only a web link to ${brand.name}. No personal details are stored on the card itself, so changing your details never means reprinting.`,
  },
  {
    q: "Can I change where my card goes?",
    a: "Yes, at any time. Edit your profile, or switch the card to open your LinkedIn profile directly. The change applies to the next tap.",
  },
  {
    q: "What if I lose a card?",
    a: "Deactivate it from your account and it stops opening your profile straight away. You can reactivate it if it turns up.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="overflow-hidden">
        <Container className="grid items-center gap-12 py-16 md:grid-cols-[1.05fr_1fr] md:py-24">
          <div>
            <h1 className="text-4xl leading-[1.05] font-bold tracking-tight text-balance sm:text-5xl">
              One tap, and they have your details.
            </h1>
            <p className="measure mt-6 text-lg leading-relaxed text-moss">
              {brand.name} cards open your profile on most modern phones. Change your details whenever you like. The card
              never needs reprinting.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <ButtonLink href="/shop" size="lg">
                Order cards
              </ButtonLink>
              <ButtonLink href="/teams" size="lg" variant="secondary">
                Cards for a team
              </ButtonLink>
            </div>
          </div>
          <TapScene />
        </Container>
      </section>

      <section id="how-it-works" className="border-y border-stone bg-sheet">
        <Container className="py-16 md:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">How it works</h2>
          <ol className="mt-10 grid gap-10 md:grid-cols-3">
            {steps.map((step, i) => (
              <li key={step.title} className="border-t-2 border-ink pt-5">
                <p className="text-sm font-semibold text-bottle">Step {i + 1}</p>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-2 leading-relaxed text-moss">{step.body}</p>
              </li>
            ))}
          </ol>
        </Container>
      </section>

      <section id="faq">
        <Container className="grid gap-10 py-16 md:grid-cols-[1fr_2fr] md:py-20">
          <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">Questions</h2>
          <dl className="divide-y divide-stone border-y border-stone">
            {faqs.map((item) => (
              <div key={item.q} className="py-5">
                <dt className="font-semibold">{item.q}</dt>
                <dd className="measure mt-2 leading-relaxed text-moss">{item.a}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>
    </>
  );
}
