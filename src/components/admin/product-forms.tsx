"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect } from "react";
import { saveOptionAction, savePricesAction, saveProductAction } from "@/actions/admin";
import type { ActionState } from "@/actions/result";
import { CURRENCIES } from "@/config/commerce";
import { ActionForm, inputClass } from "./forms";
import { Button } from "@/components/ui/button";

type ProductValues = { slug: string; name: string; description: string; customisable: boolean; isActive: boolean; sortOrder: number };

export function ProductForm({ productId, values }: { productId: string | null; values: ProductValues }) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ActionState & { productId?: string }, FormData>(saveProductAction.bind(null, productId), {});
  useEffect(() => {
    if (!productId && state.ok && state.productId) router.push(`/admin/products/${state.productId}`);
  }, [state, productId, router]);
  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2" noValidate>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Name
        <input name="name" defaultValue={values.name} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Address (/shop/…)
        <input name="slug" defaultValue={values.slug} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium sm:col-span-2">
        Description
        <textarea name="description" defaultValue={values.description} rows={3} className="rounded-control border border-ink/20 bg-sheet p-2 text-sm" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Sort order
        <input name="sortOrder" type="number" min={0} defaultValue={values.sortOrder} className={`${inputClass} w-28`} />
      </label>
      <div className="flex flex-col gap-2 text-sm">
        <label className="flex items-center gap-2">
          <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="accent-bottle" /> On sale
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" name="customisable" defaultChecked={values.customisable} className="accent-bottle" /> Offers custom printing
        </label>
      </div>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save product"}
        </Button>
        {state.message ? (
          <p role={state.ok ? "status" : "alert"} className={state.ok ? "text-sm text-bottle" : "text-sm text-danger"}>
            {state.fieldErrors ? Object.values(state.fieldErrors)[0] : state.message}
          </p>
        ) : null}
      </div>
    </form>
  );
}

export function OptionForm({
  productId,
  optionId,
  values,
}: {
  productId: string;
  optionId: string | null;
  values: { slug: string; name: string; description: string | null; inventory: number | null; isActive: boolean; sortOrder: number };
}) {
  return (
    <ActionForm action={saveOptionAction.bind(null, productId, optionId)} submitLabel={optionId ? "Save finish" : "Add finish"} variant="secondary" className="grid gap-3 sm:grid-cols-6">
      <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
        Name
        <input name="name" defaultValue={values.name} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Code
        <input name="slug" defaultValue={values.slug} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium sm:col-span-2">
        Description
        <input name="description" defaultValue={values.description ?? ""} className={inputClass} />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Stock (blank = untracked)
        <input name="inventory" inputMode="numeric" defaultValue={values.inventory ?? ""} className={inputClass} />
      </label>
      <input type="hidden" name="sortOrder" value={values.sortOrder} />
      <label className="flex items-center gap-2 text-sm sm:col-span-6">
        <input type="checkbox" name="isActive" defaultChecked={values.isActive} className="accent-bottle" /> On sale
      </label>
    </ActionForm>
  );
}

export function PriceForm({ productId, optionId, prices, label }: { productId: string; optionId: string | null; prices: Record<string, number | undefined>; label: string }) {
  return (
    <ActionForm action={savePricesAction.bind(null, productId, optionId)} submitLabel="Save prices" variant="secondary" className="flex flex-wrap items-end gap-3">
      <span className="w-full text-sm font-medium">{label}</span>
      {CURRENCIES.map((c) => (
        <label key={c} className="flex flex-col gap-1 text-xs font-medium">
          {c}
          <input name={c} inputMode="decimal" defaultValue={prices[c] === undefined ? "" : (prices[c]! / 100).toFixed(2)} placeholder="Not sold" className={`${inputClass} w-24`} />
        </label>
      ))}
    </ActionForm>
  );
}
