/**
 * Placeholder shown while a section streams in: a short label plus grey bars
 * roughly the shape of the content, so the page doesn't jump when it arrives.
 * The pulse stops under prefers-reduced-motion (see globals.css).
 */
export function Loading({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div role="status" aria-live="polite" className="flex flex-col gap-3">
      <p className="text-sm text-moss">{label.endsWith("…") ? label : `${label}…`}</p>
      {Array.from({ length: rows }, (_, i) => (
        <div
          key={i}
          aria-hidden="true"
          className="h-4 animate-pulse rounded-control bg-stone/70"
          style={{ width: `${[92, 76, 84, 60][i % 4]}%` }}
        />
      ))}
    </div>
  );
}
