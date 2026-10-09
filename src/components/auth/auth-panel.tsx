import type { ReactNode } from "react";

export function AuthPanel({ title, intro, children, footer }: { title: string; intro?: ReactNode; children: ReactNode; footer?: ReactNode }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
      {intro ? <div className="mt-2 leading-relaxed text-moss">{intro}</div> : null}
      <div className="mt-8 rounded-card border border-stone bg-sheet p-6 sm:p-8">{children}</div>
      {footer ? <div className="mt-6 text-sm text-moss">{footer}</div> : null}
    </div>
  );
}
