"use client";

import { ErrorView } from "@/components/errors/error-view";

/** Keeps the site header and footer when a page fails. */
export default function SiteError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <div className="px-4">
      <ErrorView {...props} />
    </div>
  );
}
