import Link from "next/link";
import { Suspense } from "react";
import { inputClass } from "@/components/admin/forms";
import { PageHeader, Pill, Table, statusTone } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin, searchCards } from "@/server/admin";

async function Results({ searchParams }: { searchParams: PageProps<"/admin/cards">["searchParams"] }) {
  const actor = await requireAdmin();
  const { q } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const cards = await searchCards(actor, query);
  return (
    <>
      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search cards
        </label>
        <input id="q" name="q" defaultValue={query} placeholder="Card URL, token or owner email" className={`${inputClass} w-80 max-w-full`} />
        <button type="submit" className={buttonClass("secondary")}>
          Search
        </button>
      </form>
      {cards.length === 0 ? (
        <p className="text-moss">No cards found.</p>
      ) : (
        <Table caption="Cards">
          <thead>
            <tr>
              <th>Card</th>
              <th>Status</th>
              <th>Opens</th>
              <th>Owner</th>
            </tr>
          </thead>
          <tbody>
            {cards.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/cards/${c.id}`} className="font-mono text-bottle hover:underline">
                    {c.token}
                  </Link>
                </td>
                <td>
                  <Pill tone={statusTone[c.status]}>{c.status.toLowerCase()}</Pill>
                </td>
                <td>{c.destination === "LINKEDIN" ? "LinkedIn" : "Profile"}</td>
                <td>{c.ownerEmail ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
    </>
  );
}

export default function AdminCardsPage(props: PageProps<"/admin/cards">) {
  return (
    <>
      <PageHeader title="Cards" description="Find a card to disable, reassign or return to stock." />
      <Suspense fallback={<p className="text-moss">Loading…</p>}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
