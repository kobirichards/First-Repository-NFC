import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CardIllustration } from "@/components/shop/card-illustration";
import { Container } from "@/components/ui/container";
import { currencyInfo, formatMoney } from "@/config/commerce";
import { listProducts } from "@/server/catalog";
import { getCurrency } from "@/server/currency";
import { Loading } from "@/components/ui/loading";

export const metadata: Metadata = {
  title: "Shop NFC business cards",
  description: "NFC business cards in PVC and steel, with optional printed name, title and logo.",
};

async function Products() {
  const currency = await getCurrency();
  const products = await listProducts(currency);
  if (products.length === 0) {
    return <p className="text-moss">No cards are on sale right now. Check back soon, or contact us.</p>;
  }
  return (
    <>
      <ul className="grid gap-10 md:grid-cols-2">
        {products.map((p) => (
          <li key={p.id}>
            <Link href={`/shop/${p.slug}`} className="group block">
              <div className="rounded-card bg-sheet p-8 transition-colors group-hover:bg-bottle-soft sm:p-12">
                <CardIllustration finish={p.options[0]?.slug} name="Alex Morgan" title="Head of Partnerships" className="mx-auto max-w-sm" />
              </div>
              <div className="mt-4 flex items-baseline justify-between gap-4">
                <h2 className="text-xl font-semibold group-hover:text-bottle">{p.name}</h2>
                <p className="shrink-0 font-semibold">
                  {p.fromPrice === null ? "Not available in this currency" : `From ${formatMoney(p.fromPrice, currency)}`}
                </p>
              </div>
              <p className="mt-1 leading-relaxed text-moss">{p.description}</p>
              {p.options.length ? <p className="mt-2 text-sm text-moss">{p.options.map((o) => o.name).join(", ")}</p> : null}
            </Link>
          </li>
        ))}
      </ul>
      <p className="mt-10 text-sm text-moss">
        {currencyInfo[currency].taxNote} Card images are illustrations, not photographs.
      </p>
    </>
  );
}

export default function ShopPage() {
  return (
    <Container className="py-14">
      <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Cards</h1>
      <p className="measure mt-3 text-lg leading-relaxed text-moss">
        Every card has an NFC chip and a QR code that both open your profile. Ordering 20 or more?{" "}
        <Link href="/teams" className="font-semibold text-bottle underline-offset-4 hover:underline">
          Get a team quote
        </Link>
        .
      </p>
      <div className="mt-12">
        <Suspense fallback={<Loading label="Loading cards" />}>
          <Products />
        </Suspense>
      </div>
    </Container>
  );
}
