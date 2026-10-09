"use client";

import { ErrorView } from "@/components/errors/error-view";

export default function RootError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <main id="main" className="w-full flex-1 px-4">
      <ErrorView {...props} />
    </main>
  );
}
