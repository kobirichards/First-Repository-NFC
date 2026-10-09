import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ProductForm } from "@/components/shop/product-form";
import { Container } from "@/components/ui/container";
import { currencyInfo, productionDays, shippingRates } from "@/config/commerce";
import { getProduct } from "@/server/catalog";
import { getCurrency } from "@/server/currency";

export async function generateMetadata(props: PageProps<"/shop/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const p = await getProduct(slug, "GBP");
  return p ? { title: p.name, description: p.description } : { title: "Card not found" };
}

async function Product({ params }: { params: PageProps<"/shop/[slug]">["params"] }) {
  const { slug } = await params;
  const currency = await getCurrency();
  const product = await getProduct(slug, currency);
  if (!product) notFound();
  const fastest = shippingRates[currency].reduce((a, b) => (a.minDays < b.minDays ? a : b));
  const slowest = shippingRates[currency].reduce((a, b) => (a.maxDays > b.maxDays ? a : b));
  const window = (prod: { min: number; max: number }) =>
    `${prod.min + fastest.minDays}–${prod.max + slowest.maxDays} working days`;

  return (
    <>
      <nav aria-label="Breadcrumb" className="text-sm text-moss">
        <Link href="/shop" className="hover:text-ink">
          Cards
        </Link>
        <span aria-hidden="true"> / </span>
        <span aria-current="page">{product.name}</span>
      </nav>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{product.name}</h1>
      <p className="measure mt-3 text-lg leading-relaxed text-moss">{product.description}</p>
      <div className="mt-10">
        <ProductForm
          product={product}
          currency={currency}
          taxNote={currencyInfo[currency].taxNote}
          delivery={{
            plain: `Usually arrives in ${window(productionDays.plain)}, depending on the delivery option you choose at checkout.`,
            customised: `Printed cards usually arrive ${window(productionDays.customised)} after you approve your proof.`,
          }}
        />
      </div>
    </>
  );
}

export default function ProductPage(props: PageProps<"/shop/[slug]">) {
  return (
    <Container className="py-12">
      <Suspense fallback={<p className="text-moss">Loading…</p>}>
        <Product params={props.params} />
      </Suspense>
    </Container>
  );
}
