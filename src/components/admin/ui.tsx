import type { ReactNode } from "react";
import { cn } from "@/components/ui/cn";

export function PageHeader({ title, description, actions }: { title: string; description?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? <p className="mt-1 text-sm text-moss">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

export function Table({ children, caption }: { children: ReactNode; caption: string }) {
  return (
    <div className="overflow-x-auto rounded-card border border-stone bg-sheet">
      <table className="w-full text-left text-sm [&_td]:px-4 [&_td]:py-3 [&_th]:px-4 [&_th]:py-2.5 [&_th]:font-semibold [&_tbody_tr]:border-t [&_tbody_tr]:border-stone">
        <caption className="sr-only">{caption}</caption>
        {children}
      </table>
    </div>
  );
}

const tones: Record<string, string> = {
  good: "bg-bottle-soft text-bottle-deep",
  warn: "bg-[#f6ecd6] text-[#6b4d12]",
  bad: "bg-danger-soft text-danger",
  neutral: "bg-stone text-ink",
};

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: keyof typeof tones }) {
  return <span className={cn("inline-block rounded-full px-2 py-0.5 text-xs font-semibold whitespace-nowrap", tones[tone])}>{children}</span>;
}

export function Section({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-card border border-stone bg-sheet p-5", className)}>
      <h2 className="mb-4 font-semibold">{title}</h2>
      {children}
    </section>
  );
}

export const statusTone: Record<string, keyof typeof tones> = {
  PAID: "warn",
  AWAITING_PROOF: "warn",
  IN_PRODUCTION: "warn",
  SHIPPED: "good",
  DELIVERED: "good",
  PENDING_PAYMENT: "neutral",
  CANCELLED: "bad",
  REFUNDED: "bad",
  PARTIALLY_REFUNDED: "bad",
  ACTIVE: "good",
  UNCLAIMED: "neutral",
  DEACTIVATED: "bad",
  NEW: "warn",
  IN_PROGRESS: "neutral",
  CLOSED: "good",
  PENDING: "warn",
  APPROVED: "good",
  REJECTED: "bad",
};

export const adminDate = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
