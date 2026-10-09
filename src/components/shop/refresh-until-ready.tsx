"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Re-checks the order every 2 seconds for up to ~40 seconds while the payment webhook arrives. */
export function RefreshUntilReady({ attempt }: { attempt: number }) {
  const router = useRouter();
  useEffect(() => {
    if (attempt >= 20) return;
    const t = setTimeout(() => {
      const url = new URL(window.location.href);
      url.searchParams.set("attempt", String(attempt + 1));
      router.replace(url.pathname + url.search);
    }, 2000);
    return () => clearTimeout(t);
  }, [attempt, router]);
  return null;
}
