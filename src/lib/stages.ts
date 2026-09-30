export const STAGES = ["NO_VENDIDO", "SEGUIMIENTO", "POSIBLE_COMPRA", "VENDIDO"] as const;

export type Stage = (typeof STAGES)[number];

export const STAGE_LABELS: Record<Stage, string> = {
  NO_VENDIDO: "No vendido",
  SEGUIMIENTO: "Seguimiento",
  POSIBLE_COMPRA: "Posible compra",
  VENDIDO: "Vendido",
};

/** Clases de Tailwind por etapa. */
export const STAGE_STYLES: Record<Stage, { badge: string; dot: string; column: string }> = {
  NO_VENDIDO: {
    badge: "bg-slate-100 text-slate-700 ring-slate-200",
    dot: "bg-slate-400",
    column: "bg-slate-50",
  },
  SEGUIMIENTO: {
    badge: "bg-amber-50 text-amber-800 ring-amber-200",
    dot: "bg-amber-400",
    column: "bg-amber-50/60",
  },
  POSIBLE_COMPRA: {
    badge: "bg-sky-50 text-sky-800 ring-sky-200",
    dot: "bg-sky-500",
    column: "bg-sky-50/60",
  },
  VENDIDO: {
    badge: "bg-emerald-50 text-emerald-800 ring-emerald-200",
    dot: "bg-emerald-500",
    column: "bg-emerald-50/60",
  },
};

export function isStage(value: unknown): value is Stage {
  return typeof value === "string" && (STAGES as readonly string[]).includes(value);
}

/**
 * Fecha de venta al cambiar de etapa: se completa al entrar en VENDIDO,
 * se conserva si ya estaba vendido y se borra al salir de VENDIDO.
 */
export function nextSoldAt(
  previous: { stage: string; soldAt: Date | null } | null,
  newStage: Stage,
  now: Date = new Date(),
): Date | null {
  if (newStage !== "VENDIDO") return null;
  if (previous?.stage === "VENDIDO" && previous.soldAt) return previous.soldAt;
  return now;
}
