/** Fósforos como en el anotador de papel: cuadrados de a 5 (cuatro lados y la diagonal). */

const LINES = [
  [6, 6, 34, 6],
  [34, 6, 34, 34],
  [34, 34, 6, 34],
  [6, 34, 6, 6],
  [6, 6, 34, 34],
] as const;

function Group({ count }: { count: number }) {
  return (
    <svg viewBox="0 0 40 40" className="size-12 md:size-14" aria-hidden="true">
      <rect x="6" y="6" width="28" height="28" className="fill-none stroke-slate-200" strokeWidth={1} strokeDasharray="2 3" />
      {LINES.slice(0, count).map(([x1, y1, x2, y2], i) => (
        <g key={i}>
          <line x1={x1} y1={y1} x2={x2} y2={y2} className="stroke-amber-600" strokeWidth={3} strokeLinecap="round" />
          <circle cx={x2} cy={y2} r={2.8} className="fill-rose-600" />
        </g>
      ))}
    </svg>
  );
}

function Groups({ score, groups }: { score: number; groups: number }) {
  return (
    <div className="flex flex-col items-center gap-1">
      {Array.from({ length: groups }, (_, i) => (
        <Group key={i} count={Math.max(0, Math.min(5, score - i * 5))} />
      ))}
    </div>
  );
}

export function Fosforos({ score, target }: { score: number; target: number }) {
  if (target !== 30) return <Groups score={score} groups={Math.ceil(target / 5)} />;
  const half = target / 2;
  return (
    <div className="flex flex-col items-center">
      <Groups score={Math.min(score, half)} groups={half / 5} />
      <div className="my-2 flex w-full items-center gap-2 text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
        <span className="h-px flex-1 bg-slate-300" />
        buenas
        <span className="h-px flex-1 bg-slate-300" />
      </div>
      <Groups score={Math.max(0, score - half)} groups={half / 5} />
    </div>
  );
}
