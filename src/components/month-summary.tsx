import type { MonthPlan } from "@/lib/planning";
import { ProgressBar } from "./ui";

export function MonthProgress({ plan }: { plan: MonthPlan }) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <p>
          <span className="text-3xl font-semibold tabular-nums">{plan.totalSales}</span>
          <span className="text-slate-500"> / {plan.goal} ventas</span>
        </p>
        <p className="text-xl font-semibold tabular-nums">{plan.percentage}%</p>
      </div>
      <ProgressBar value={plan.totalSales} max={plan.goal} className="mt-2" />
      <p className="mt-2 text-sm text-slate-500">
        {plan.remaining === 0
          ? plan.totalSales > plan.goal
            ? `¡Objetivo superado por ${plan.totalSales - plan.goal}!`
            : "¡Objetivo cumplido!"
          : `Faltan ${plan.remaining} ${plan.remaining === 1 ? "venta" : "ventas"}.`}
      </p>
    </div>
  );
}

/** Explicación en texto del estado del plan (adelantado / atrasado). */
export function PlanMessage({ plan }: { plan: MonthPlan }) {
  const openWeeks = plan.weeks.filter((w) => w.timing !== "pasada").length;
  const closedWeeks = plan.weeks.length - openWeeks;

  if (openWeeks === 0) {
    return <p>El mes ya terminó. El plan ajustado muestra lo vendido en cada semana.</p>;
  }
  if (closedWeeks === 0) {
    return <p>Todavía no cerró ninguna semana: el plan ajustado coincide con el original.</p>;
  }

  const n = Math.abs(plan.deviation);
  const ventas = n === 1 ? "venta" : "ventas";
  const stateText =
    plan.deviation < 0
      ? <>Vas <strong className="text-rose-700">{n} {ventas} atrasado</strong> respecto al plan original.</>
      : plan.deviation > 0
        ? <>Vas <strong className="text-emerald-700">{n} {ventas} adelantado</strong> respecto al plan original.</>
        : <>Vas <strong>al día</strong> con el plan original.</>;

  const pending = Math.max(0, plan.goal - plan.weeks.filter((w) => w.timing === "pasada").reduce((a, w) => a + w.actual, 0));

  return (
    <p>
      {stateText}{" "}
      {pending === 0
        ? "Ya alcanzaste el objetivo con las semanas cerradas."
        : `El plan ajustado reparte ${pending === 1 ? "la venta que falta" : `las ${pending} ventas que faltan`} en ${
            openWeeks === 1 ? "la semana que queda" : `las ${openWeeks} semanas que quedan`
          }.`}
    </p>
  );
}
