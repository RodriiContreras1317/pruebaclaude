import Link from "next/link";
import { GoalForm } from "@/components/goal-form";
import { ChevronLeftIcon, ChevronRightIcon } from "@/components/icons";
import { MonthProgress, PlanMessage } from "@/components/month-summary";
import { Card, PageHeader, buttonStyles } from "@/components/ui";
import { WeekPlanTable } from "@/components/week-plan";
import { currentYearMonth, monthParam, monthTitle, parseMonthParam } from "@/lib/dates";
import { getMonthPlan } from "@/lib/goals";
import { shiftMonth } from "@/lib/planning";

export const dynamic = "force-dynamic";

export default async function ObjetivosPage({ searchParams }: PageProps<"/objetivos">) {
  const { mes } = await searchParams;
  const current = currentYearMonth();
  const { year, month } = parseMonthParam(typeof mes === "string" ? mes : undefined) ?? current;
  const plan = await getMonthPlan(year, month);

  const prev = shiftMonth(year, month, -1);
  const next = shiftMonth(year, month, 1);
  const isCurrent = year === current.year && month === current.month;

  return (
    <>
      <PageHeader title="Objetivos" subtitle="Plan de ventas semanal y replanificación según lo vendido." />

      <div className="mb-5 flex items-center justify-between gap-2">
        <Link
          href={`/objetivos?mes=${monthParam(prev.year, prev.month)}`}
          className={buttonStyles.icon}
          aria-label="Mes anterior"
        >
          <ChevronLeftIcon className="size-5" />
        </Link>
        <div className="text-center">
          <h2 className="text-lg font-semibold md:text-xl">{monthTitle(year, month)}</h2>
          {!isCurrent && (
            <Link href="/objetivos" className="text-xs font-medium text-sky-700 hover:underline">
              Ir al mes actual
            </Link>
          )}
        </div>
        <Link
          href={`/objetivos?mes=${monthParam(next.year, next.month)}`}
          className={buttonStyles.icon}
          aria-label="Mes siguiente"
        >
          <ChevronRightIcon className="size-5" />
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-[1fr_auto]">
        <Card>
          <MonthProgress plan={plan} />
        </Card>
        <Card className="flex items-center">
          <GoalForm key={`${year}-${month}`} year={year} month={month} goal={plan.goal} />
        </Card>
      </div>

      <div className="my-5 rounded-xl bg-white px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
        <PlanMessage plan={plan} />
      </div>

      <WeekPlanTable weeks={plan.weeks} />

      <details className="mt-5 text-sm text-slate-500">
        <summary className="cursor-pointer font-medium text-slate-600">¿Cómo se calcula el plan?</summary>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>Las semanas van de lunes a domingo. Si una semana está partida entre dos meses, recibe una parte del objetivo proporcional a sus días hábiles (lunes a viernes) dentro del mes.</li>
          <li>Los números se redondean hacia abajo y lo que sobra se suma de a una venta a las primeras semanas, así el total siempre da exacto.</li>
          <li><strong>Plan ajustado:</strong> las semanas cerradas cuentan lo vendido y lo que falta para el objetivo se reparte, con el mismo criterio, entre la semana actual y las siguientes.</li>
          <li>Una semana cerrada está <em>cumplida</em> si alcanzó su plan original y <em>atrasada</em> si no.</li>
        </ul>
      </details>
    </>
  );
}
