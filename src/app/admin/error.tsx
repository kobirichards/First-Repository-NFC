"use client";

import { ErrorView } from "@/components/errors/error-view";

export default function AdminError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView {...props} home={{ href: "/admin", label: "Back to admin" }} />;
}
