import { cn } from "@/components/ui/cn";

/** Illustrative colours per finish (by option slug). Not photographs: labelled as such where shown. */
const finishes: Record<string, { bg: string; fg: string; sub: string; accent: string; border?: string }> = {
  "matte-black": { bg: "#1c1f1e", fg: "#ffffff", sub: "rgba(255,255,255,.65)", accent: "#ffffff" },
  "bottle-green": { bg: "#1f4d3f", fg: "#ffffff", sub: "rgba(255,255,255,.7)", accent: "#b38b3f" },
  "recycled-white": { bg: "#f4f3ef", fg: "#14231e", sub: "#5b6b64", accent: "#14231e", border: "#dce1dc" },
  "brushed-steel": { bg: "linear-gradient(135deg,#c9cdcc 0%,#eef0ef 45%,#b9bebd 100%)", fg: "#14231e", sub: "#3f4a46", accent: "#14231e", border: "#b9bebd" },
  "black-steel": { bg: "linear-gradient(135deg,#232625 0%,#3a3e3d 50%,#1d201f 100%)", fg: "#e9ecea", sub: "rgba(233,236,234,.65)", accent: "#c9a45a" },
};

export function CardIllustration({
  finish,
  name = "Your Name",
  title = "Your title",
  className,
}: {
  finish?: string | null;
  name?: string;
  title?: string;
  className?: string;
}) {
  const f = finishes[finish ?? ""] ?? finishes["bottle-green"];
  return (
    <div
      aria-hidden="true"
      className={cn("@container relative aspect-[1.586] w-full overflow-hidden rounded-card shadow-card", className)}
      style={{ background: f.bg, color: f.fg, border: f.border ? `1px solid ${f.border}` : undefined }}
    >
      <div className="absolute inset-0 p-[7%]">
        <div className="flex items-start justify-between">
          <span className="inline-block size-[3.5cqw] min-h-2 min-w-2 rotate-45 rounded-[2px]" style={{ background: f.accent }} />
          <svg viewBox="0 0 24 24" className="size-[7cqw] min-h-4 min-w-4 opacity-80" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" strokeLinecap="round" />
          </svg>
        </div>
        <div className="absolute bottom-[9%] left-[7%] right-[7%]">
          <p className="truncate text-[clamp(0.8rem,3.4cqw,1.35rem)] font-semibold leading-tight">{name || " "}</p>
          <p className="truncate text-[clamp(0.65rem,2.4cqw,0.95rem)]" style={{ color: f.sub }}>
            {title || " "}
          </p>
        </div>
      </div>
    </div>
  );
}
