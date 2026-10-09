/**
 * The hero's one orchestrated moment: a card moves to a phone, and the
 * profile appears on the screen. Pure CSS, plays once, and is static under
 * prefers-reduced-motion. Decorative, so hidden from assistive tech.
 */
export function TapScene() {
  return (
    <div aria-hidden="true" className="tap-scene relative mx-auto h-[360px] w-full max-w-[460px] sm:h-[420px]">
      {/* Phone */}
      <div className="absolute right-2 top-2 h-[340px] w-[176px] rounded-[30px] border-[6px] border-ink bg-ink shadow-card sm:h-[400px] sm:w-[206px]">
        <div className="relative h-full w-full overflow-hidden rounded-[24px] bg-sheet">
          <div className="mx-auto mt-2 h-4 w-16 rounded-full bg-ink" />
          <div className="tap-profile px-4 pt-6">
            <div className="size-14 rounded-full bg-bottle-soft ring-2 ring-sheet" />
            <div className="mt-4 h-3.5 w-28 rounded bg-ink" />
            <div className="mt-2 h-2.5 w-20 rounded bg-moss/50" />
            <div className="mt-1.5 h-2.5 w-24 rounded bg-moss/30" />
            <div className="mt-6 flex h-9 items-center justify-center rounded-md bg-bottle text-[11px] font-semibold text-white">
              Connect on LinkedIn
            </div>
            <div className="mt-2 flex h-9 items-center justify-center rounded-md border border-ink/20 text-[11px] font-semibold text-ink">
              Save contact
            </div>
          </div>
          <div className="tap-ripple absolute left-1/2 top-[44%] size-24 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-bottle/40" />
        </div>
      </div>
      {/* Card */}
      <div className="tap-card absolute bottom-6 left-0 h-[150px] w-[240px] rounded-card bg-bottle p-5 text-white shadow-card sm:h-[168px] sm:w-[270px]">
        <div className="flex items-start justify-between">
          <span className="inline-block size-3 rotate-45 rounded-[2px] bg-brass" />
          <svg viewBox="0 0 24 24" className="size-6 opacity-80" fill="none" stroke="currentColor" strokeWidth="1.6">
            <path d="M8.5 8.5a5 5 0 0 1 0 7M12 6a8.5 8.5 0 0 1 0 12M15.5 3.5a12 12 0 0 1 0 17" strokeLinecap="round" />
          </svg>
        </div>
        <div className="absolute bottom-5 left-5">
          <p className="text-base font-semibold">Alex Morgan</p>
          <p className="text-xs text-white/70">Head of Partnerships</p>
        </div>
      </div>
      <style>{`
        @keyframes tap-card-move {
          0%, 15% { transform: translate(0, 0) rotate(-6deg); }
          55% { transform: translate(120px, -110px) rotate(-14deg); }
          70% { transform: translate(110px, -100px) rotate(-14deg); }
          100% { transform: translate(0, 0) rotate(-6deg); }
        }
        @keyframes tap-profile-in {
          0%, 55% { opacity: 0; transform: translateY(10px); }
          75%, 100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes tap-ripple {
          0%, 52% { opacity: 0; transform: translate(-50%, -50%) scale(0.4); }
          60% { opacity: 1; }
          80%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); }
        }
        .tap-card { transform: rotate(-6deg); animation: tap-card-move 2.6s cubic-bezier(.4,0,.2,1) 0.3s 1 both; }
        .tap-profile { animation: tap-profile-in 2.6s ease-out 0.3s 1 both; }
        .tap-ripple { opacity: 0; animation: tap-ripple 2.6s ease-out 0.3s 1 both; }
        @media (prefers-reduced-motion: reduce) {
          .tap-card, .tap-profile, .tap-ripple { animation: none; }
          .tap-profile { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
