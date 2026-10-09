import { brand } from "@/config/brand";

/** Wordmark: the brand name with a small brass tessera (square tile). */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="inline-flex items-center gap-2 text-lg font-bold tracking-tight text-ink">
        <span aria-hidden="true" className="inline-block size-3 rotate-45 rounded-[2px] bg-brass" />
        {brand.name}
      </span>
    </span>
  );
}
