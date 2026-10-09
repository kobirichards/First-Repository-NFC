import Link from "next/link";
import { Suspense } from "react";
import { inputClass } from "@/components/admin/forms";
import { PageHeader, Pill, Table, statusTone } from "@/components/admin/ui";
import { buttonClass } from "@/components/ui/button";
import { requireAdmin, searchCards } from "@/server/admin";
import { Loading } from "@/components/ui/loading";
import { Pagination } from "@/components/ui/pagination";
import { parsePage } from "@/server/pagination";

async function Results({ searchParams }: { searchParams: PageProps<"/admin/cards">["searchParams"] }) {
  const actor = await requireAdmin();
  const { q, page } = await searchParams;
  const query = typeof q === "string" ? q : "";
  const { rows: cards, page: current, hasNext } = await searchCards(actor, query, parsePage(page));
  return (
    <>
      <form className="mb-5 flex flex-wrap gap-2" role="search">
        <label htmlFor="q" className="sr-only">
          Search cards
        </label>
        <input
          id="q"
          name="q"
          defaultValue={query}
          placeholder="Card URL, token or owner email"
          className={`${inputClass} w-80 max-w-full`}
        />
        <button type="submit" className={buttonClass("secondary")}>
          Search
        </button>
      </form>
      {cards.length === 0 ? (
        <p className="text-moss">
          {query ? `No cards match “${query}”.` : current > 1 ? "No more cards." : "No cards yet. Create a batch to add some."}
        </p>
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
                <td>{c.ownerEmail ?? "No owner"}</td>
              </tr>
            ))}
          </tbody>
        </Table>
      )}
      <Pagination page={current} hasNext={hasNext} pathname="/admin/cards" params={{ q: query }} label="Card pages" />
    </>
  );
}

export default function AdminCardsPage(props: PageProps<"/admin/cards">) {
  return (
    <>
      <PageHeader title="Cards" description="Find a card to disable, reassign or return to stock." />
      <Suspense fallback={<Loading />}>
        <Results searchParams={props.searchParams} />
      </Suspense>
    </>
  );
}
