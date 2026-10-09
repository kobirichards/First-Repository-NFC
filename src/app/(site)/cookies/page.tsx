import type { Metadata } from "next";
import { DraftBanner, Prose } from "@/components/content/prose";

export const metadata: Metadata = { title: "Cookie policy" };

const cookies = [
  ["better-auth.session_token", "Keeps you signed in", "30 days, renewed while you use the site"],
  ["better-auth.two_factor", "Remembers a sign-in waiting for its two-step code", "A few minutes"],
  ["better-auth.dont_remember", "Set if you sign in without staying signed in", "Session"],
  ["cart_id", "Remembers your basket", "30 days"],
  ["currency", "Remembers the currency you chose", "1 year"],
];

export default function CookiesPage() {
  return (
    <>
      <DraftBanner />
      <Prose title="Cookie policy" intro="We only use cookies that the site needs to work. There are no analytics, advertising or tracking cookies.">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Purpose</th>
              <th>Lasts</th>
            </tr>
          </thead>
          <tbody>
            {cookies.map(([name, purpose, lasts]) => (
              <tr key={name}>
                <td className="font-mono text-xs">{name}</td>
                <td>{purpose}</td>
                <td>{lasts}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p>
          On secure (https) connections, sign-in cookie names start with <code>__Secure-</code>. Public profile pages, the ones people
          see when they tap a card, set no cookies at all.
        </p>
        <p>
          Because these cookies are strictly necessary, we don&apos;t ask for consent to use them. [Confirm under UK PECR / the EU
          ePrivacy rules. If analytics or marketing tools are ever added, a consent banner will be needed first.]
        </p>
        <p>
          When you pay, Stripe&apos;s checkout page may set its own cookies for fraud prevention. Those are covered by Stripe&apos;s
          policies.
        </p>
      </Prose>
    </>
  );
}
