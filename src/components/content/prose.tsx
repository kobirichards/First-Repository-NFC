import type { ReactNode } from "react";
import { Container } from "@/components/ui/container";

/** Long-form text pages: readable measure, consistent heading rhythm. */
export function Prose({ title, intro, children, updated }: { title: string; intro?: ReactNode; children: ReactNode; updated?: string }) {
  return (
    <Container className="py-14">
      <article className="max-w-[68ch]">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{title}</h1>
        {updated ? <p className="mt-2 text-sm text-moss">Last updated {updated}</p> : null}
        {intro ? <div className="mt-4 text-lg leading-relaxed text-moss">{intro}</div> : null}
        <div className="mt-10 leading-relaxed [&_a]:font-medium [&_a]:text-bottle [&_a]:underline-offset-4 hover:[&_a]:underline [&_h2]:mt-10 [&_h2]:mb-3 [&_h2]:text-xl [&_h2]:font-semibold [&_h3]:mt-6 [&_h3]:mb-2 [&_h3]:font-semibold [&_li]:mt-1.5 [&_p]:mt-4 [&_table]:mt-4 [&_table]:w-full [&_table]:text-sm [&_td]:border-t [&_td]:border-stone [&_td]:py-2 [&_td]:pr-4 [&_td]:align-top [&_th]:pb-2 [&_th]:pr-4 [&_th]:text-left [&_ul]:mt-4 [&_ul]:list-disc [&_ul]:pl-5">
          {children}
        </div>
      </article>
    </Container>
  );
}

/** Required on every legal page until a qualified professional has reviewed it. */
export function DraftBanner() {
  return (
    <div role="note" className="border-b border-[#e3cf9f] bg-[#f6ecd6] px-4 py-3 text-center text-sm font-semibold text-[#5c420f]">
      Draft. A qualified professional must review this page before the site takes orders.
    </div>
  );
}
