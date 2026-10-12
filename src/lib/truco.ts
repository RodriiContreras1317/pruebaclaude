/** Lógica pura de torneos de truco: sin acceso a la base de datos. */

export const FORMATS = ["LIGA", "ELIMINACION"] as const;
export type Format = (typeof FORMATS)[number];

export const FORMAT_LABELS: Record<Format, string> = {
  LIGA: "Liga (todos contra todos)",
  ELIMINACION: "Eliminación directa",
};

export function isFormat(value: string): value is Format {
  return (FORMATS as readonly string[]).includes(value);
}

/** Puntos para ganar un partido. A 30 se juega en malas (1–15) y buenas (16–30). */
export const TARGETS = [15, 30] as const;
export type Target = (typeof TARGETS)[number];

export const MIN_TEAMS = 2;
export const MAX_TEAMS = 64;

export type Side = "A" | "B";

/** Nuevo puntaje después de sumar (o restar) puntos, sin bajar de 0 ni pasar del objetivo. */
export function applyPoints(score: number, delta: number, target: number): number {
  return Math.min(target, Math.max(0, score + delta));
}

export function winnerSide(scoreA: number, scoreB: number, target: number): Side | null {
  if (scoreA >= target) return "A";
  if (scoreB >= target) return "B";
  return null;
}

/** Texto del puntaje como se canta en la mesa: "8 malas", "3 buenas". */
export function scoreLabel(score: number, target: number): string {
  if (target !== 30) return `${score} ${score === 1 ? "punto" : "puntos"}`;
  if (score === 0) return "0";
  const half = target / 2;
  return score <= half ? `${score} ${score === 1 ? "mala" : "malas"}` : `${score - half} ${score - half === 1 ? "buena" : "buenas"}`;
}

/** Partidos de una fecha de liga. `null` en un lado significa que ese equipo queda libre. */
export interface Pairing<T> {
  round: number;
  position: number;
  a: T;
  b: T;
}

/**
 * Fixture todos contra todos (método del círculo). Cada equipo juega una vez contra cada
 * otro; con un número impar de equipos, en cada fecha uno queda libre y no se genera partido.
 */
export function roundRobin<T>(teams: readonly T[]): Pairing<T>[] {
  const list: (T | null)[] = [...teams];
  if (list.length % 2 === 1) list.push(null);
  const n = list.length;
  const pairings: Pairing<T>[] = [];

  for (let round = 0; round < n - 1; round++) {
    let position = 0;
    for (let i = 0; i < n / 2; i++) {
      const home = list[i];
      const away = list[n - 1 - i];
      if (home === null || away === null) continue;
      // Alterna quién figura primero para que el equipo fijo no sea siempre "A".
      const swap = i === 0 && round % 2 === 1;
      pairings.push({ round: round + 1, position: position++, a: swap ? away : home, b: swap ? home : away });
    }
    // Rota todos menos el primero.
    list.splice(1, 0, list.pop()!);
  }
  return pairings;
}

/** Orden de cabezas de serie para un cuadro de `size` lugares: [1, 8, 4, 5, 2, 7, 3, 6] para 8. */
export function seedOrder(size: number): number[] {
  let order = [1];
  while (order.length < size) {
    const next = order.length * 2 + 1;
    order = order.flatMap((s) => [s, next - s]);
  }
  return order;
}

export function bracketRounds(teamCount: number): number {
  return Math.max(1, Math.ceil(Math.log2(teamCount)));
}

export interface BracketSlot<T> {
  round: number;
  position: number;
  a: T | null;
  b: T | null;
  /** Primera ronda con un solo equipo: pasa directo. */
  bye: boolean;
  winner: T | null;
}

/**
 * Cuadro de eliminación directa. Los equipos se ubican como cabezas de serie en el orden
 * recibido; si no son potencia de 2, los primeros pasan directo a la segunda ronda (bye).
 * Las rondas siguientes se crean vacías y se completan con los ganadores.
 */
export function buildBracket<T>(teams: readonly T[]): BracketSlot<T>[] {
  const rounds = bracketRounds(teams.length);
  const size = 2 ** rounds;
  const order = seedOrder(size);
  const slots: BracketSlot<T>[] = [];

  for (let position = 0; position < size / 2; position++) {
    const a = teams[order[position * 2] - 1] ?? null;
    const b = teams[order[position * 2 + 1] - 1] ?? null;
    const bye = a === null || b === null;
    slots.push({ round: 1, position, a, b, bye, winner: bye ? (a ?? b) : null });
  }
  for (let round = 2; round <= rounds; round++) {
    for (let position = 0; position < size / 2 ** round; position++) {
      slots.push({ round, position, a: null, b: null, bye: false, winner: null });
    }
  }
  // Los que pasan directo ya quedan ubicados en la segunda ronda.
  for (const slot of slots) {
    if (!slot.bye) continue;
    const next = nextSlot(slot.round, slot.position, rounds)!;
    const target = slots.find((s) => s.round === next.round && s.position === next.position)!;
    if (next.side === "A") target.a = slot.winner;
    else target.b = slot.winner;
  }
  return slots;
}

/** Dónde juega el ganador de un partido de eliminación, o `null` si era la final. */
export function nextSlot(round: number, position: number, rounds: number): { round: number; position: number; side: Side } | null {
  if (round >= rounds) return null;
  return { round: round + 1, position: Math.floor(position / 2), side: position % 2 === 0 ? "A" : "B" };
}

export function roundName(round: number, rounds: number): string {
  const fromEnd = rounds - round;
  if (fromEnd === 0) return "Final";
  if (fromEnd === 1) return "Semifinal";
  if (fromEnd === 2) return "Cuartos de final";
  if (fromEnd === 3) return "Octavos de final";
  return `Ronda ${round}`;
}

export interface MatchResult {
  teamAId: number | null;
  teamBId: number | null;
  scoreA: number;
  scoreB: number;
  winnerId: number | null;
  bye: boolean;
}

export interface StandingRow {
  teamId: number;
  played: number;
  won: number;
  lost: number;
  pointsFor: number;
  pointsAgainst: number;
  diff: number;
}

/**
 * Tabla de posiciones de liga. Solo cuentan los partidos terminados.
 * Orden: partidos ganados, diferencia de tantos, tantos a favor y, al final, el orden del sorteo.
 */
export function standings(teamIds: readonly number[], matches: readonly MatchResult[]): StandingRow[] {
  const rows = new Map<number, StandingRow>(
    teamIds.map((teamId) => [teamId, { teamId, played: 0, won: 0, lost: 0, pointsFor: 0, pointsAgainst: 0, diff: 0 }]),
  );

  for (const m of matches) {
    if (m.bye || m.winnerId === null || m.teamAId === null || m.teamBId === null) continue;
    const a = rows.get(m.teamAId);
    const b = rows.get(m.teamBId);
    if (!a || !b) continue;
    a.played++;
    b.played++;
    a.pointsFor += m.scoreA;
    a.pointsAgainst += m.scoreB;
    b.pointsFor += m.scoreB;
    b.pointsAgainst += m.scoreA;
    if (m.winnerId === m.teamAId) {
      a.won++;
      b.lost++;
    } else {
      b.won++;
      a.lost++;
    }
  }

  const order = new Map(teamIds.map((id, i) => [id, i]));
  return [...rows.values()]
    .map((r) => ({ ...r, diff: r.pointsFor - r.pointsAgainst }))
    .sort(
      (x, y) =>
        y.won - x.won ||
        y.diff - x.diff ||
        y.pointsFor - x.pointsFor ||
        order.get(x.teamId)! - order.get(y.teamId)!,
    );
}

/** Parsea la lista de equipos: uno por renglón, sin vacíos. */
export function parseTeamNames(text: string): string[] {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim().replace(/\s+/g, " "))
    .filter(Boolean);
}

/** Mezcla Fisher–Yates. `random` se puede inyectar para los tests. */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
