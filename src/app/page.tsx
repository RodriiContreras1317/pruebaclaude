import Link from "next/link";
import { MonthProgress } from "@/components/month-summary";
import { Card, PageHeader, StageBadge, StageCounters } from "@/components/ui";
import { WeekStatusBadge } from "@/components/week-plan";
import { WhatsAppButton } from "@/components/whatsapp-button";
import { currentYearMonth, formatRange, monthTitle, todayISO, toLocalISODate } from "@/lib/dates";
import { getMonthPlan } from "@/lib/goals";
import { getPriorityLeads, getStageCounts } from "@/lib/leads";
import { formatArPhone } from "@/lib/phone";
import { parseISODate } from "@/lib/planning";

export const dynamic = "force-dynamic";

function daysSince(iso: string) {
  const diff = parseISODate(todayISO()).getTime() - parseISODate(toLocalISODate(new Date(iso))).getTime();
  return Math.round(diff / 86_400_000);
}

function lastUpdateText(iso: string) {
  const days = daysSince(iso);
  if (days <= 0) return "Actualizado hoy";
  if (days === 1) return "Actualizado ayer";
  return `Sin cambios hace ${days} días`;
}

export default async function DashboardPage() {
  const { year, month } = currentYearMonth();
  const [plan, counts, priority] = await Promise.all([
    getMonthPlan(year, month),
    getStageCounts(),
    getPriorityLeads(),
  ]);
  const week = plan.currentWeek;
  const weekMissing = week ? Math.max(0, week.adjusted - week.actual) : 0;

  return (
    <>
      <PageHeader title="Inicio" subtitle={`Resumen de ${monthTitle(year, month).toLowerCase()}`} />

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Objetivo del mes</h2>
            <Link href="/objetivos" className="text-sm font-medium text-sky-700 hover:underline">
              Ver plan
            </Link>
          </div>
          <MonthProgress plan={plan} />
        </Card>

        <Card>
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="font-semibold">Esta semana</h2>
            {week && <WeekStatusBadge status={week.status} />}
          </div>
          {week ? (
            <>
              <p className="text-sm text-slate-500">
                Semana {week.index + 1} · {formatRange(week.start, week.end)}
              </p>
              <div className="mt-3 grid grid-cols-2 gap-3">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Ventas necesarias</p>
                  <p className="text-3xl font-semibold tabular-nums">{week.adjusted}</p>
                  {week.adjusted !== week.planned && (
                    <p className="text-xs text-slate-500">Plan original: {week.planned}</p>
                  )}
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Llevás</p>
                  <p className="text-3xl font-semibold tabular-nums">{week.actual}</p>
                </div>
              </div>
              <p className="mt-3 text-sm text-slate-600">
                {weekMissing > 0
                  ? `Te ${weekMissing === 1 ? "falta 1 venta" : `faltan ${weekMissing} ventas`} para cumplir la semana.`
                  : "¡Semana cumplida!"}
              </p>
            </>
          ) : (
            <p className="text-sm text-slate-500">No hay una semana en curso para este mes.</p>
          )}
        </Card>
      </div>

      <h2 className="mt-8 mb-3 font-semibold">Leads por etapa</h2>
      <StageCounters counts={counts} href={(s) => `/leads?vista=tabla&etapa=${s}`} />

      <div className="mt-8 mb-3 flex items-baseline justify-between">
        <h2 className="font-semibold">Para contactar</h2>
        <span className="text-sm text-slate-500">{priority.length} leads</span>
      </div>
      {priority.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500">No hay leads en seguimiento ni con posible compra.</p>
        </Card>
      ) : (
        <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {priority.map((lead) => (
            <li key={lead.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <Link href={`/leads/${lead.id}/editar`} className="truncate font-medium hover:underline">
                    {lead.fullName}
                  </Link>
                  <StageBadge stage={lead.stage} />
                </div>
                <p className="text-sm tabular-nums text-slate-500">{formatArPhone(lead.phone)}</p>
                {lead.notes && <p className="mt-0.5 line-clamp-1 text-sm text-slate-600">{lead.notes}</p>}
                <p className="mt-0.5 text-xs text-slate-400">{lastUpdateText(lead.updatedAt)}</p>
              </div>
              <WhatsAppButton phone={lead.phone} compact />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
