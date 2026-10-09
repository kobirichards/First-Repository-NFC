"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import type { ActionState } from "@/actions/result";
import { addToCartAction, uploadArtworkAction } from "@/actions/shop";
import { Button, buttonClass } from "@/components/ui/button";
import { Checkbox, Field } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
import { type Currency, MAX_QUANTITY_PER_LINE, formatMoney } from "@/config/commerce";
import { uploadProblem } from "@/config/uploads";
import { CardIllustration } from "./card-illustration";

type Option = { id: string; slug: string; name: string; description: string | null; price: number | null; inStock: boolean };

export function ProductForm({
  product,
  currency,
  taxNote,
  delivery,
}: {
  product: { id: string; name: string; customisable: boolean; basePrice: number | null; options: Option[] };
  currency: Currency;
  taxNote: string;
  delivery: { plain: string; customised: string };
}) {
  const firstAvailable = product.options.find((o) => o.inStock && o.price !== null) ?? product.options[0];
  const [optionId, setOptionId] = useState(firstAvailable?.id ?? "");
  const [quantity, setQuantity] = useState(1);
  const [customise, setCustomise] = useState(false);
  const [printName, setPrintName] = useState("");
  const [printTitle, setPrintTitle] = useState("");
  const [artwork, setArtwork] = useState<{ key?: string; message?: string; ok?: boolean }>({});
  const [uploading, startUpload] = useTransition();
  const [state, dispatch] = useActionState<ActionState, FormData>(addToCartAction, {});
  const [adding, startAdd] = useTransition();

  const option = product.options.find((o) => o.id === optionId);
  const unit = option ? option.price : product.basePrice;
  const safeQty = Number.isFinite(quantity) && quantity >= 1 ? Math.min(quantity, MAX_QUANTITY_PER_LINE) : 1;
  const purchasable = unit !== null && (option ? option.inStock : true);

  return (
    <div className="grid gap-10 md:grid-cols-[1.1fr_1fr] md:gap-16">
      <div className="md:sticky md:top-8 md:self-start">
        <div className="rounded-card bg-sheet p-8 sm:p-14">
          <CardIllustration
            finish={option?.slug}
            name={customise && printName ? printName : "Your Name"}
            title={customise && printTitle ? printTitle : "Your title"}
          />
        </div>
        <p className="mt-3 text-sm text-moss">Illustration. Colours on screen are approximate.</p>
      </div>

      <form
        className="flex flex-col gap-7"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          if (!customise) {
            data.delete("printName");
            data.delete("printTitle");
            data.delete("artworkKey");
          }
          startAdd(() => dispatch(data));
        }}
      >
        <input type="hidden" name="productId" value={product.id} />
        <div>
          <p className="text-3xl font-bold" aria-live="polite">
            {unit === null ? "Not available in this currency" : formatMoney(unit, currency)}
            {unit !== null ? <span className="ml-2 text-base font-normal text-moss">each</span> : null}
          </p>
          <p className="mt-1 text-sm text-moss">{taxNote}</p>
        </div>

        {product.options.length ? (
          <fieldset>
            <legend className="text-sm font-semibold">Finish</legend>
            <div className="mt-3 grid gap-2">
              {product.options.map((o) => (
                <label
                  key={o.id}
                  className="flex cursor-pointer items-start gap-3 rounded-control border border-ink/15 bg-sheet p-3.5 has-[:checked]:border-bottle has-[:checked]:ring-1 has-[:checked]:ring-bottle has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"
                >
                  <input
                    type="radio"
                    name="optionId"
                    value={o.id}
                    checked={optionId === o.id}
                    disabled={!o.inStock || o.price === null}
                    onChange={() => setOptionId(o.id)}
                    className="mt-1 accent-bottle"
                  />
                  <span className="flex-1">
                    <span className="flex justify-between gap-3 font-medium">
                      {o.name}
                      <span>{o.price === null ? "" : formatMoney(o.price, currency)}</span>
                    </span>
                    <span className="block text-sm text-moss">{!o.inStock ? "Out of stock" : o.description}</span>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <div className="flex max-w-40 flex-col gap-1.5">
          <label htmlFor="quantity" className="text-sm font-semibold">
            Quantity
          </label>
          <input
            id="quantity"
            name="quantity"
            type="number"
            inputMode="numeric"
            min={1}
            max={MAX_QUANTITY_PER_LINE}
            value={Number.isFinite(quantity) ? quantity : ""}
            onChange={(e) => setQuantity(e.currentTarget.valueAsNumber)}
            aria-describedby="quantity-hint"
            className="h-11 rounded-control border border-ink/20 bg-sheet px-3"
          />
        </div>
        <p id="quantity-hint" className="-mt-5 text-sm text-moss">
          Up to {MAX_QUANTITY_PER_LINE}.{" "}
          <Link href="/teams" className="font-semibold text-bottle underline-offset-4 hover:underline">
            Ordering for a team?
          </Link>
        </p>

        {product.customisable ? (
          <div className="flex flex-col gap-5 rounded-card border border-stone bg-sheet p-5">
            <Checkbox
              checked={customise}
              onChange={(e) => setCustomise(e.currentTarget.checked)}
              label={<span className="font-semibold">Print my name, title or logo on the card</span>}
              hint="No extra charge. We email you a proof to approve before we print."
            />
            {customise ? (
              <>
                <Field label="Name to print" name="printName" value={printName} onChange={(e) => setPrintName(e.currentTarget.value)} maxLength={40} error={state.fieldErrors?.printName} />
                <Field label="Title to print" name="printTitle" value={printTitle} onChange={(e) => setPrintTitle(e.currentTarget.value)} maxLength={60} error={state.fieldErrors?.printTitle} />
                <div className="flex flex-col gap-2">
                  <label htmlFor="artwork" className="text-sm font-semibold">
                    Logo (optional)
                  </label>
                  <input
                    id="artwork"
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    aria-describedby="artwork-hint"
                    className="text-sm file:mr-3 file:rounded-control file:border file:border-ink/20 file:bg-sheet file:px-3 file:py-2 file:font-semibold"
                    onChange={(e) => {
                      const file = e.currentTarget.files?.[0];
                      if (!file) return;
                      const problem = uploadProblem(file);
                      if (problem) {
                        setArtwork({ message: problem, ok: false });
                        e.currentTarget.value = "";
                        return;
                      }
                      const data = new FormData();
                      data.set("artwork", file);
                      startUpload(async () => {
                        try {
                          const result = await uploadArtworkAction(data);
                          setArtwork({ key: result.artworkKey, message: result.message, ok: result.ok });
                        } catch {
                          setArtwork({ message: "The upload didn't finish. Check your connection and try again.", ok: false });
                        }
                      });
                    }}
                  />
                  <p id="artwork-hint" className="text-sm text-moss">
                    PNG with a transparent background works best. Up to 5 MB.
                  </p>
                  {uploading ? <p className="text-sm text-moss">Uploading…</p> : null}
                  {artwork.message ? (
                    <p role={artwork.ok ? "status" : "alert"} className={artwork.ok ? "text-sm font-medium text-bottle" : "text-sm font-medium text-danger"}>
                      {artwork.message}
                    </p>
                  ) : null}
                  <input type="hidden" name="artworkKey" value={artwork.key ?? ""} />
                </div>
              </>
            ) : null}
          </div>
        ) : null}

        <p className="text-sm text-moss">{customise ? delivery.customised : delivery.plain}</p>

        {state.message ? (
          state.ok ? (
            <Notice tone="success" title={state.message}>
              <Link href="/cart" className="font-semibold underline">
                View basket and check out
              </Link>
            </Notice>
          ) : (
            <Notice tone="error">{state.message}</Notice>
          )
        ) : null}

        <div className="flex flex-wrap items-center gap-4">
          <Button type="submit" size="lg" disabled={!purchasable || adding || uploading}>
            {adding ? "Adding…" : unit === null ? "Unavailable" : `Add to basket: ${formatMoney(unit * safeQty, currency)}`}
          </Button>
          {state.ok ? (
            <Link href="/cart" className={buttonClass("secondary", "lg")}>
              Go to basket
            </Link>
          ) : null}
        </div>
      </form>
    </div>
  );
}
