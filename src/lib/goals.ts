import { prisma } from "./db";
import { toLocalISODate, todayISO } from "./dates";
import { buildMonthPlan, DEFAULT_MONTHLY_GOAL, type MonthPlan } from "./planning";

export async function getMonthlyGoal(year: number, month: number): Promise<number> {
  const goal = await prisma.monthlyGoal.findUnique({ where: { year_month: { year, month } } });
  return goal?.target ?? DEFAULT_MONTHLY_GOAL;
}

/** Fechas de venta (YYYY-MM-DD, hora de Argentina) del mes. */
export async function getSaleDates(year: number, month: number): Promise<string[]> {
  // Margen de un día a cada lado para cubrir la diferencia horaria con UTC.
  const from = new Date(Date.UTC(year, month - 1, 0));
  const to = new Date(Date.UTC(year, month, 2));
  const sold = await prisma.lead.findMany({
    where: { stage: "VENDIDO", soldAt: { gte: from, lt: to } },
    select: { soldAt: true },
  });

  const prefix = `${year}-${String(month).padStart(2, "0")}-`;
  return sold
    .map((l) => toLocalISODate(l.soldAt!))
    .filter((d) => d.startsWith(prefix));
}

export async function getMonthPlan(year: number, month: number): Promise<MonthPlan> {
  const [goal, saleDates] = await Promise.all([
    getMonthlyGoal(year, month),
    getSaleDates(year, month),
  ]);
  return buildMonthPlan({ year, month, goal, saleDates, today: todayISO() });
}
