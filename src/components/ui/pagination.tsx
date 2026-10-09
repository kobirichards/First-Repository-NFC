import Link from "next/link";
import { buttonClass } from "./button";

/**
 * Previous/next links that keep the page's other query parameters (search, filters).
 * Renders nothing when everything fits on one page.
 */
export function Pagination({
  page,
  hasNext,
  pathname,
  params = {},
  label = "Pages",
}: {
  page: number;
  hasNext: boolean;
  pathname: string;
  params?: Record<string, string | undefined>;
  label?: string;
}) {
  if (page <= 1 && !hasNext) return null;
  const href = (p: number) => {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
    if (p > 1) search.set("page", String(p));
    const qs = search.toString();
    return qs ? `${pathname}?${qs}` : pathname;
  };
  return (
    <nav aria-label={label} className="mt-6 flex items-center gap-3 text-sm">
      {page > 1 ? (
        <Link href={href(page - 1)} className={buttonClass("secondary")} rel="prev">
          Previous
        </Link>
      ) : null}
      <span className="text-moss">Page {page}</span>
      {hasNext ? (
        <Link href={href(page + 1)} className={buttonClass("secondary")} rel="next">
          Next
        </Link>
      ) : null}
    </nav>
  );
}
