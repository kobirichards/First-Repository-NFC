"use client";

import "./globals.css";
import { ErrorView } from "@/components/errors/error-view";

/** Last resort: replaces the root layout if it fails, so it brings its own <html> and styles. */
export default function GlobalError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="en-GB" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        <title>Something went wrong</title>
        <main id="main" className="w-full flex-1 px-4">
          <ErrorView {...props} />
        </main>
      </body>
    </html>
  );
}
