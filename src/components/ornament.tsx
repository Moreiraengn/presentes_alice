import { cn } from "@/lib/utils";

/**
 * Raminho de oliveira em traço fino — o ornamento da identidade.
 * Usa a cor do texto (currentColor): mude com classes como `text-line` ou `text-accent`.
 */
export function Branch({ className, flip }: { className?: string; flip?: boolean }) {
  // folhas alternadas ao longo de um galho levemente curvo
  const leaves = [
    { x: 22, y: 21, r: -32 },
    { x: 34, y: 17, r: 28 },
    { x: 48, y: 17.5, r: -30 },
    { x: 62, y: 14.5, r: 26 },
    { x: 76, y: 15, r: -28 },
    { x: 90, y: 12, r: 24 },
  ];
  return (
    <svg
      viewBox="0 0 120 32"
      fill="none"
      stroke="currentColor"
      strokeWidth={1}
      strokeLinecap="round"
      className={cn("h-auto w-28", flip && "-scale-x-100", className)}
      aria-hidden
    >
      <path d="M6 25 C 30 19, 60 16, 112 9" />
      {leaves.map((l, i) => (
        <g key={i} transform={`translate(${l.x} ${l.y}) rotate(${l.r})`}>
          <path d="M0 0 C 3 -5, 10 -6, 14 -4 C 10 -1, 4 0.5, 0 0 Z" />
          <path d="M1.5 -0.6 L 11 -3.6" strokeWidth={0.5} />
        </g>
      ))}
      <circle cx="113" cy="8.6" r="1.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** Divisória: linha — raminho — linha */
export function BranchDivider({ className }: { className?: string }) {
  return (
    <div className={cn("flex items-center justify-center gap-4 text-line", className)} aria-hidden>
      <span className="h-px w-12 bg-current opacity-60 md:w-20" />
      <Branch className="w-20 md:w-24" />
      <span className="h-px w-12 bg-current opacity-60 md:w-20" />
    </div>
  );
}
