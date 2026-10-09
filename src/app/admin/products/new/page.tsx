import { Suspense } from "react";
import { ProductForm } from "@/components/admin/product-forms";
import { PageHeader, Section } from "@/components/admin/ui";
import { requireAdmin } from "@/server/admin";
import { Loading } from "@/components/ui/loading";

async function Guarded() {
  await requireAdmin();
  return (
    <Section title="Details">
      <ProductForm productId={null} values={{ slug: "", name: "", description: "", customisable: false, isActive: false, sortOrder: 0 }} />
    </Section>
  );
}

export default function NewProductPage() {
  return (
    <>
      <PageHeader title="New product" description="It stays hidden from the shop until you tick On sale and set prices." />
      <Suspense fallback={<Loading />}>
        <Guarded />
      </Suspense>
    </>
  );
}
