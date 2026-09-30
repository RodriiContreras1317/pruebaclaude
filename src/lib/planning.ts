/**
 * Planificación de objetivos mensuales.
 *
 * Todas las funciones son puras y trabajan con fechas civiles "YYYY-MM-DD"
 * (sin hora ni zona horaria). Quien las llama es responsable de convertir
 * las fechas reales a la zona horaria del negocio (ver lib/dates.ts).
 */

export type ISODate = string;

export type WeekTiming = "pasada" | "actual" | "futura";
export type WeekStatus = "cumplida" | "en_curso" | "atrasada" | "pendiente";

export interface MonthWeek {
  /** Posición de la semana dentro del mes (0 = primera). */
  index: number;
  /** Lunes de la semana (puede caer en el mes anterior). */
  start: ISODate;
  /** Domingo de la semana (puede caer en el mes siguiente). */
  end: ISODate;
  /** Primer día de la semana que cae dentro del mes. */
  monthStart: ISODate;
  /** Último día de la semana que cae dentro del mes. */
  monthEnd: ISODate;
  /** Días hábiles (lunes a viernes) de la semana que caen dentro del mes. */
  businessDays: number;
}

export interface WeekPlan extends MonthWeek {
  /** Ventas del plan original. */
  planned: number;
  /** Ventas del plan ajustado (semanas cerradas = ventas reales). */
  adjusted: number;
  /** Ventas reales con fecha de venta dentro de la semana (y del mes). */
  actual: number;
  timing: WeekTiming;
  status: WeekStatus;
}

export interface MonthPlan {
  year: number;
  month: number;
  goal: number;
  weeks: WeekPlan[];
  /** Ventas reales del mes. */
  totalSales: number;
  /** Ventas que faltan para llegar al objetivo (nunca negativo). */
  remaining: number;
  /** Porcentaje de avance, redondeado. Puede superar 100. */
  percentage: number;
  /**
   * Diferencia entre lo vendido en semanas cerradas y lo que pedía el plan
   * original para esas semanas. Positivo = adelantado, negativo = atrasado.
   */
  deviation: number;
  currentWeek: WeekPlan | null;
}

export const DEFAULT_MONTHLY_GOAL = 10;

const DAY_MS = 86_400_000;

export function parseISODate(date: ISODate): Date {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function toISODate(date: Date): ISODate {
  return date.toISOString().slice(0, 10);
}

export function addDays(date: ISODate, days: number): ISODate {
  return toISODate(new Date(parseISODate(date).getTime() + days * DAY_MS));
}

/** 0 = lunes … 6 = domingo. */
export function weekday(date: ISODate): number {
  return (parseISODate(date).getUTCDay() + 6) % 7;
}

export function monthBounds(year: number, month: number) {
  return {
    first: toISODate(new Date(Date.UTC(year, month - 1, 1))),
    last: toISODate(new Date(Date.UTC(year, month, 0))),
  };
}

/** Semanas de lunes a domingo que tocan el mes, con sus días hábiles dentro del mes. */
export function getMonthWeeks(year: number, month: number): MonthWeek[] {
  const { first, last } = monthBounds(year, month);
  const weeks: MonthWeek[] = [];

  // Las fechas ISO se pueden comparar como strings.
  for (let start = addDays(first, -weekday(first)); start <= last; start = addDays(start, 7)) {
    const end = addDays(start, 6);
    const monthStart = start < first ? first : start;
    const monthEnd = end > last ? last : end;

    let businessDays = 0;
    for (let d = monthStart; d <= monthEnd; d = addDays(d, 1)) {
      if (weekday(d) < 5) businessDays++;
    }

    weeks.push({ index: weeks.length, start, end, monthStart, monthEnd, businessDays });
  }

  return weeks;
}

/**
 * Reparte `total` en enteros proporcionales a `weights`. El resultado siempre
 * suma exactamente `total`; lo que sobra del redondeo hacia abajo se asigna de
 * a una unidad a las primeras posiciones con peso mayor a cero.
 */
export function distribute(total: number, weights: number[]): number[] {
  if (weights.length === 0) return [];

  const target = Math.max(0, Math.floor(total));
  let w = weights.map((x) => Math.max(0, x));
  let sum = w.reduce((a, b) => a + b, 0);

  // Sin pesos útiles: repartir en partes iguales.
  if (sum === 0) {
    w = w.map(() => 1);
    sum = w.length;
  }

  const result = w.map((x) => Math.floor((target * x) / sum));
  let rest = target - result.reduce((a, b) => a + b, 0);

  for (let i = 0; rest > 0; i = (i + 1) % w.length) {
    if (w[i] > 0) {
      result[i]++;
      rest--;
    }
  }

  return result;
}

export interface BuildMonthPlanInput {
  year: number;
  month: number;
  goal: number;
  /** Fechas de venta (YYYY-MM-DD). Las que no caen en el mes se ignoran. */
  saleDates: ISODate[];
  /** Fecha de hoy (YYYY-MM-DD). */
  today: ISODate;
}

export function buildMonthPlan({ year, month, goal, saleDates, today }: BuildMonthPlanInput): MonthPlan {
  const weeks = getMonthWeeks(year, month);
  const weights = weeks.map((w) => w.businessDays);
  const planned = distribute(goal, weights);

  const actual = weeks.map(
    (w) => saleDates.filter((d) => d >= w.monthStart && d <= w.monthEnd).length,
  );

  const timing: WeekTiming[] = weeks.map((w) =>
    today > w.monthEnd ? "pasada" : today < w.monthStart ? "futura" : "actual",
  );

  // Replanificación: lo que falta después de las semanas cerradas se reparte
  // entre la semana en curso y las futuras con los mismos pesos.
  const closedSales = sumWhere(actual, timing, "pasada");
  const openIndexes = weeks.map((_, i) => i).filter((i) => timing[i] !== "pasada");
  const openPlan = distribute(
    Math.max(0, goal - closedSales),
    openIndexes.map((i) => weights[i]),
  );

  const adjusted = weeks.map((_, i) =>
    timing[i] === "pasada" ? actual[i] : openPlan[openIndexes.indexOf(i)],
  );

  const totalSales = actual.reduce((a, b) => a + b, 0);
  const goalReached = totalSales >= goal;

  const weekPlans: WeekPlan[] = weeks.map((w, i) => ({
    ...w,
    planned: planned[i],
    adjusted: adjusted[i],
    actual: actual[i],
    timing: timing[i],
    status: weekStatus(timing[i], actual[i], planned[i], adjusted[i], goalReached),
  }));

  return {
    year,
    month,
    goal,
    weeks: weekPlans,
    totalSales,
    remaining: Math.max(0, goal - totalSales),
    percentage: goal > 0 ? Math.round((totalSales / goal) * 100) : 100,
    deviation: closedSales - sumWhere(planned, timing, "pasada"),
    currentWeek: weekPlans.find((w) => w.timing === "actual") ?? null,
  };
}

function weekStatus(
  timing: WeekTiming,
  actual: number,
  planned: number,
  adjusted: number,
  goalReached: boolean,
): WeekStatus {
  switch (timing) {
    case "pasada":
      return actual >= planned ? "cumplida" : "atrasada";
    case "actual":
      return actual >= adjusted && (adjusted > 0 || goalReached) ? "cumplida" : "en_curso";
    case "futura":
      return "pendiente";
  }
}

function sumWhere(values: number[], timing: WeekTiming[], match: WeekTiming): number {
  return values.reduce((acc, v, i) => (timing[i] === match ? acc + v : acc), 0);
}

/** Mes (1-12) siguiente o anterior, para navegar. */
export function shiftMonth(year: number, month: number, delta: number) {
  const index = year * 12 + (month - 1) + delta;
  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}
