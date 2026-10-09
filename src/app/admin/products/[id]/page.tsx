import { notFound } from "next/navigation";
import { Suspense } from "react";
import { OptionForm, PriceForm, ProductForm } from "@/components/admin/product-forms";
import { PageHeader, Section } from "@/components/admin/ui";
import { NotFoundError } from "@/server/errors";
import { getProductForAdmin, requireAdmin } from "@/server/admin";
import { Loading } from "@/components/ui/loading";

async function ProductAdmin({ params }: { params: PageProps<"/admin/products/[id]">["params"] }) {
  const actor = await requireAdmin();
  const { id } = await params;
  let p;
  try {
    p = await getProductForAdmin(actor, id);
  } catch (error) {
    if (error instanceof NotFoundError) notFound();
    throw error;
  }
  const pricesFor = (optionId: string | null) =>
    Object.fromEntries(p.prices.filter((x) => x.optionId === optionId).map((x) => [x.currency, x.amount])) as Record<string, number>;
  return (
    <>
      <PageHeader title={p.name} description={`/shop/${p.slug}`} />
      <div className="flex flex-col gap-6">
        <Section title="Details">
          <ProductForm productId={p.id} values={p} />
        </Section>
        <Section title="Prices">
          <div className="flex flex-col gap-6">
            <PriceForm productId={p.id} optionId={null} prices={pricesFor(null)} label="Product price (used when a finish has no price of its own)" />
            {p.options.map((o) => (
              <PriceForm key={o.id} productId={p.id} optionId={o.id} prices={pricesFor(o.id)} label={`${o.name} (leave blank to use the product price)`} />
            ))}
          </div>
          <p className="mt-4 text-sm text-moss">Leave a currency blank to stop selling in it. UK/EU prices should include VAT.</p>
        </Section>
        <Section title="Finishes">
          <div className="flex flex-col gap-6">
            {p.options.map((o) => (
              <OptionForm key={o.id} productId={p.id} optionId={o.id} values={o} />
            ))}
            <div className="border-t border-stone pt-6">
              <OptionForm productId={p.id} optionId={null} values={{ slug: "", name: "", description: null, inventory: null, isActive: true, sortOrder: p.options.length }} />
            </div>
          </div>
        </Section>
      </div>
    </>
  );
}

export default function AdminProductPage(props: PageProps<"/admin/products/[id]">) {
  return (
    <Suspense fallback={<Loading />}>
      <ProductAdmin params={props.params} />
    </Suspense>
  );
}
