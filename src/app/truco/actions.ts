"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import {
  applyPoints,
  buildBracket,
  FORMATS,
  MAX_TEAMS,
  MIN_TEAMS,
  nextSlot,
  parseTeamNames,
  roundRobin,
  shuffle,
  TARGETS,
  winnerSide,
  type Side,
} from "@/lib/truco";

export interface TournamentFormState {
  errors?: Partial<Record<"name" | "format" | "target" | "teams", string[]>>;
}

const tournamentSchema = z.object({
  name: z.string().trim().min(1, "Poné un nombre para el torneo.").max(80, "El nombre es demasiado largo."),
  format: z.enum(FORMATS, { message: "Elegí un formato." }),
  target: z.coerce
    .number()
    .refine((v) => (TARGETS as readonly number[]).includes(v), "Elegí a cuántos puntos se juega."),
  teams: z
    .string()
    .transform(parseTeamNames)
    .pipe(
      z
        .array(z.string().max(60, "Cada nombre de equipo puede tener hasta 60 caracteres."))
        .min(MIN_TEAMS, `Cargá al menos ${MIN_TEAMS} equipos.`)
        .max(MAX_TEAMS, `Como máximo ${MAX_TEAMS} equipos.`)
        .refine(
          (names) => new Set(names.map((n) => n.toLocaleLowerCase("es"))).size === names.length,
          "Hay equipos repetidos.",
        ),
    ),
  shuffle: z.boolean(),
});

export async function createTournament(_prev: TournamentFormState, formData: FormData): Promise<TournamentFormState> {
  const parsed = tournamentSchema.safeParse({
    name: formData.get("name") ?? "",
    format: formData.get("format") ?? "",
    target: formData.get("target") ?? "",
    teams: formData.get("teams") ?? "",
    shuffle: formData.get("shuffle") === "on",
  });
  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const { name, format, target, teams, shuffle: doShuffle } = parsed.data;
  const ordered = doShuffle ? shuffle(teams) : teams;

  const id = await prisma.$transaction(async (tx) => {
    const tournament = await tx.tournament.create({ data: { name, format, target } });
    const created = await tx.team.createManyAndReturn({
      data: ordered.map((teamName, i) => ({ tournamentId: tournament.id, name: teamName, seed: i + 1 })),
    });
    const ids = created.sort((a, b) => a.seed - b.seed).map((t) => t.id);

    const matches =
      format === "LIGA"
        ? roundRobin(ids).map((p) => ({ round: p.round, position: p.position, teamAId: p.a, teamBId: p.b }))
        : buildBracket(ids).map((s) => ({
            round: s.round,
            position: s.position,
            teamAId: s.a,
            teamBId: s.b,
            bye: s.bye,
            winnerId: s.winner,
          }));
    await tx.match.createMany({ data: matches.map((m) => ({ ...m, tournamentId: tournament.id })) });
    return tournament.id;
  });

  revalidatePath("/truco");
  redirect(`/truco/${id}`);
}

export async function deleteTournament(id: number) {
  await prisma.tournament.delete({ where: { id } });
  revalidatePath("/truco");
  redirect("/truco");
}

export interface ScoreResult {
  error?: string;
}

/**
 * Suma (o resta, con delta negativo) puntos a un equipo. Al llegar al objetivo el partido
 * termina y, en eliminación, el ganador pasa al partido siguiente. Restarle al ganador
 * reabre el partido, salvo que el partido siguiente ya haya empezado.
 */
export async function addPoints(matchId: number, side: Side, delta: number): Promise<ScoreResult> {
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 30) return { error: "Cantidad inválida." };

  const result = await prisma.$transaction(async (tx): Promise<ScoreResult & { tournamentId?: number }> => {
    const match = await tx.match.findUnique({ where: { id: matchId }, include: { tournament: true } });
    if (!match) return { error: "El partido no existe." };
    if (match.bye || match.teamAId === null || match.teamBId === null) {
      return { error: "Todavía no están los dos equipos de este partido." };
    }
    const { target, format } = match.tournament;
    const finished = match.winnerId !== null;
    // Un partido terminado solo se puede corregir restando.
    if (finished && delta > 0) return { tournamentId: match.tournamentId };

    const scoreA = side === "A" ? applyPoints(match.scoreA, delta, target) : match.scoreA;
    const scoreB = side === "B" ? applyPoints(match.scoreB, delta, target) : match.scoreB;
    const winner = winnerSide(scoreA, scoreB, target);
    const winnerId = winner === "A" ? match.teamAId : winner === "B" ? match.teamBId : null;

    if (format === "ELIMINACION" && winnerId !== match.winnerId) {
      const { _max } = await tx.match.aggregate({ where: { tournamentId: match.tournamentId }, _max: { round: true } });
      const next = nextSlot(match.round, match.position, _max.round ?? match.round);
      if (next) {
        const where = {
          tournamentId_round_position: { tournamentId: match.tournamentId, round: next.round, position: next.position },
        };
        const nextMatch = await tx.match.findUnique({ where });
        if (nextMatch && (nextMatch.scoreA > 0 || nextMatch.scoreB > 0 || nextMatch.winnerId !== null)) {
          return { error: "No se puede corregir: el partido siguiente ya empezó." };
        }
        await tx.match.update({ where, data: next.side === "A" ? { teamAId: winnerId } : { teamBId: winnerId } });
      }
    }

    await tx.match.update({ where: { id: matchId }, data: { scoreA, scoreB, winnerId } });
    return { tournamentId: match.tournamentId };
  });

  if (result.tournamentId) {
    revalidatePath(`/truco/${result.tournamentId}`, "layout");
    revalidatePath("/truco");
  }
  return result.error ? { error: result.error } : {};
}
