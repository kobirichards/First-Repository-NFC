"use client";

import { ErrorView } from "@/components/errors/error-view";

export default function DashboardError(props: { error: Error & { digest?: string }; retry: () => void }) {
  return <ErrorView {...props} home={{ href: "/dashboard", label: "Back to your account" }} />;
}
