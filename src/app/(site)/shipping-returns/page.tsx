import type { Metadata } from "next";
import { DraftBanner, Prose } from "@/components/content/prose";
import { type Currency, CURRENCIES, formatMoney, productionDays, shippingCountries, shippingRates } from "@/config/commerce";

export const metadata: Metadata = { title: "Shipping and returns" };

const regionName: Record<Currency, string> = { GBP: "United Kingdom", EUR: "European Union", USD: "United States" };

export default function ShippingReturnsPage() {
  return (
    <>
      <DraftBanner />
      <Prose title="Shipping and returns" intro="Where we ship, how long it takes, and what to do if something's wrong.">
        <h2>Delivery</h2>
        <p>
          Plain cards are made in {productionDays.plain.min}–{productionDays.plain.max} working days. Printed cards are made in{" "}
          {productionDays.customised.min}–{productionDays.customised.max} working days after you approve your proof. Delivery time is added
          on top.
        </p>
        <table>
          <thead>
            <tr>
              <th>Region</th>
              <th>Option</th>
              <th>Price</th>
              <th>Delivery time</th>
            </tr>
          </thead>
          <tbody>
            {CURRENCIES.flatMap((c) =>
              shippingRates[c].map((r) => (
                <tr key={`${c}-${r.id}`}>
                  <td>{regionName[c]}</td>
                  <td>{r.name}</td>
                  <td>{r.amount === 0 ? "Free" : formatMoney(r.amount, c)}</td>
                  <td>
                    {r.minDays}–{r.maxDays} working days
                  </td>
                </tr>
              )),
            )}
          </tbody>
        </table>
        <p className="text-sm text-moss">EU delivery currently covers: {shippingCountries.EUR.join(", ")}.</p>

        <h2>Changing your mind</h2>
        <p>
          If you live in the UK or EU you can cancel an order for <strong>plain cards</strong> within 14 days of receiving it, for any reason.
          Email us, then send the cards back unused within 14 days of telling us. We refund the price of the cards and the standard
          delivery cost within 14 days of getting them back.
        </p>
        <p>
          <strong>Printed cards</strong> (with your name, title or logo) are made to your specification, so the 14-day right to cancel
          doesn&apos;t apply once we&apos;ve started making them. You can still cancel free of charge until you approve your proof.
        </p>

        <h2>Faulty cards</h2>
        <p>
          If a card arrives damaged, doesn&apos;t open your link when tapped, or doesn&apos;t match the proof you approved, contact us with
          your order reference. We&apos;ll replace it or refund you. This doesn&apos;t affect your legal rights.
        </p>

        <h2>Lost or stolen cards</h2>
        <p>
          Sign in, go to <a href="/dashboard/cards">Your cards</a> and deactivate the card. It stops opening your profile straight away.
        </p>
      </Prose>
    </>
  );
}
