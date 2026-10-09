import type { ReactNode } from "react";
import { cn } from "./cn";

type Tone = "info" | "success" | "error";

const tones: Record<Tone, string> = {
  info: "border-stone bg-sheet text-ink",
  success: "border-bottle/30 bg-ok-soft text-ink",
  error: "border-danger/30 bg-danger-soft text-danger",
};

/** Inline status message. Errors are announced immediately; others politely. */
export function Notice({ tone = "info", title, children, className }: { tone?: Tone; title?: string; children?: ReactNode; className?: string }) {
  return (
    <div
      role={tone === "error" ? "alert" : "status"}
      className={cn("rounded-control border px-4 py-3 text-sm leading-relaxed", tones[tone], className)}
    >
      {title ? <p className="font-semibold">{title}</p> : null}
      {children ? <div className={title ? "mt-1" : undefined}>{children}</div> : null}
    </div>
  );
}
