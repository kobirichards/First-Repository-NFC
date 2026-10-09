"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/** Uses the native share sheet where available, otherwise copies the link. */
export function ShareButton({ url, title }: { url: string; title: string }) {
  const [status, setStatus] = useState<string | null>(null);

  async function share() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setStatus("Link copied");
    } catch {
      setStatus(`Copy this link: ${url}`);
    }
  }

  return (
    <div className="flex flex-col items-stretch gap-2">
      <Button variant="secondary" size="lg" onClick={share}>
        Share profile
      </Button>
      <p role="status" className="min-h-5 text-center text-sm text-moss">
        {status}
      </p>
    </div>
  );
}
