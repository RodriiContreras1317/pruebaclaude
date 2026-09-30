import type { ISODate } from "./planning";

export const TIME_ZONE = "America/Argentina/Buenos_Aires";

const isoFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: TIME_ZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** Fecha civil (YYYY-MM-DD) de un instante, en hora de Argentina. */
export function toLocalISODate(date: Date): ISODate {
  return isoFormatter.format(date);
}

export function todayISO(): ISODate {
  return toLocalISODate(new Date());
}

export function currentYearMonth() {
  const [year, month] = todayISO().split("-").map(Number);
  return { year, month };
}

const MONTHS = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const SHORT_MONTHS = MONTHS.map((m) => m.slice(0, 3));

export function monthName(month: number): string {
  return MONTHS[month - 1];
}

export function monthTitle(year: number, month: number): string {
  const name = monthName(month);
  return `${name[0].toUpperCase()}${name.slice(1)} ${year}`;
}

/** "28 sep – 4 oct" o "5 – 11 oct". */
export function formatRange(start: ISODate, end: ISODate): string {
  const [, sm, sd] = start.split("-").map(Number);
  const [, em, ed] = end.split("-").map(Number);
  return sm === em
    ? `${sd} – ${ed} ${SHORT_MONTHS[em - 1]}`
    : `${sd} ${SHORT_MONTHS[sm - 1]} – ${ed} ${SHORT_MONTHS[em - 1]}`;
}

/** "14/10/2026" a partir de un instante, en hora de Argentina. */
export function formatDate(date: Date | string): string {
  const [y, m, d] = toLocalISODate(new Date(date)).split("-");
  return `${d}/${m}/${y}`;
}

/** Parámetro de URL "2026-10" -> { year, month } o null. */
export function parseMonthParam(value: string | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})$/);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12 || year < 2000 || year > 2100) return null;
  return { year, month };
}

export function monthParam(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, "0")}`;
}
