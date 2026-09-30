import { formatRange } from "@/lib/dates";
import type { WeekPlan, WeekStatus } from "@/lib/planning";

const STATUS: Record<WeekStatus, { label: string; className: string }> = {
  cumplida: { label: "Cumplida", className: "bg-emerald-50 text-emerald-700 ring-emerald-200" },
  en_curso: { label: "En curso", className: "bg-sky-50 text-sky-700 ring-sky-200" },
  atrasada: { label: "Atrasada", className: "bg-rose-50 text-rose-700 ring-rose-200" },
  pendiente: { label: "Pendiente", className: "bg-slate-100 text-slate-600 ring-slate-200" },
};

export function WeekStatusBadge({ status }: { status: WeekStatus }) {
  const s = STATUS[status];
  return (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${s.className}`}>
      {s.label}
    </span>
  );
}

function AdjustedValue({ week }: { week: WeekPlan }) {
  if (week.timing === "pasada") {
    return <span className="text-slate-400" title="Semana cerrada: cuenta lo vendido">{week.adjusted}</span>;
  }
  const diff = week.adjusted - week.planned;
  return (
    <span className="font-semibold">
      {week.adjusted}
      {diff !== 0 && (
        <span className={`ml-1 text-xs font-medium ${diff > 0 ? "text-rose-600" : "text-emerald-600"}`}>
          ({diff > 0 ? "+" : ""}
          {diff})
        </span>
      )}
    </span>
  );
}

export function WeekPlanTable({ weeks }: { weeks: WeekPlan[] }) {
  return (
    <>
      {/* Celular */}
      <ul className="space-y-2 md:hidden">
        {weeks.map((w) => (
          <li
            key={w.index}
            className={`rounded-xl border bg-white p-3 shadow-sm ${w.timing === "actual" ? "border-sky-300 ring-1 ring-sky-200" : "border-slate-200"}`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">Semana {w.index + 1}</p>
                <p className="text-xs text-slate-500">
                  {formatRange(w.start, w.end)} · {w.businessDays} días hábiles
                </p>
              </div>
              <WeekStatusBadge status={w.status} />
            </div>
            <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div className="rounded-lg bg-slate-50 py-2">
                <dt className="text-[11px] text-slate-500">Original</dt>
                <dd className="text-lg tabular-nums">{w.planned}</dd>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <dt className="text-[11px] text-slate-500">Ajustado</dt>
                <dd className="text-lg tabular-nums">
                  <AdjustedValue week={w} />
                </dd>
              </div>
              <div className="rounded-lg bg-slate-50 py-2">
                <dt className="text-[11px] text-slate-500">Real</dt>
                <dd className="text-lg font-semibold tabular-nums">{w.actual}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      {/* Escritorio */}
      <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
            <tr>
              <th className="px-4 py-3">Semana</th>
              <th className="px-4 py-3">Fechas</th>
              <th className="px-4 py-3 text-right">Días hábiles</th>
              <th className="px-4 py-3 text-right">Plan original</th>
              <th className="px-4 py-3 text-right">Plan ajustado</th>
              <th className="px-4 py-3 text-right">Ventas reales</th>
              <th className="px-4 py-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 tabular-nums">
            {weeks.map((w) => (
              <tr key={w.index} className={w.timing === "actual" ? "bg-sky-50/50" : undefined}>
                <td className="px-4 py-3 font-medium">
                  Semana {w.index + 1}
                  {w.timing === "actual" && <span className="ml-2 text-xs font-normal text-sky-700">(actual)</span>}
                </td>
                <td className="px-4 py-3 text-slate-600">{formatRange(w.start, w.end)}</td>
                <td className="px-4 py-3 text-right text-slate-600">{w.businessDays}</td>
                <td className="px-4 py-3 text-right">{w.planned}</td>
                <td className="px-4 py-3 text-right">
                  <AdjustedValue week={w} />
                </td>
                <td className="px-4 py-3 text-right font-semibold">{w.actual}</td>
                <td className="px-4 py-3">
                  <WeekStatusBadge status={w.status} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
