import { prisma } from "./db";
import { isFormat, standings, type Format, type StandingRow } from "./truco";

export interface TeamDTO {
  id: number;
  name: string;
  seed: number;
}

export interface MatchDTO {
  id: number;
  round: number;
  position: number;
  teamA: TeamDTO | null;
  teamB: TeamDTO | null;
  scoreA: number;
  scoreB: number;
  winnerId: number | null;
  bye: boolean;
}

export interface TournamentSummary {
  id: number;
  name: string;
  format: Format;
  target: number;
  createdAt: string;
  teamCount: number;
  matchCount: number;
  finishedCount: number;
  champion: string | null;
}

export interface TournamentDetail {
  id: number;
  name: string;
  format: Format;
  target: number;
  teams: TeamDTO[];
  matches: MatchDTO[];
  rounds: number;
  standings: StandingRow[];
  champion: TeamDTO | null;
}

const toFormat = (value: string): Format => (isFormat(value) ? value : "LIGA");

/** Partidos que se juegan de verdad (sin los pases libres). */
const isPlayable = (m: { bye: boolean }) => !m.bye;

export async function getTournaments(): Promise<TournamentSummary[]> {
  const tournaments = await prisma.tournament.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { teams: true } },
      matches: { select: { bye: true, winnerId: true, round: true, winner: { select: { name: true } } } },
    },
  });

  return tournaments.map((t) => {
    const format = toFormat(t.format);
    const playable = t.matches.filter(isPlayable);
    const finished = playable.filter((m) => m.winnerId !== null);
    let champion: string | null = null;
    if (format === "ELIMINACION") {
      const lastRound = Math.max(...t.matches.map((m) => m.round));
      champion = t.matches.find((m) => m.round === lastRound)?.winner?.name ?? null;
    }
    return {
      id: t.id,
      name: t.name,
      format,
      target: t.target,
      createdAt: t.createdAt.toISOString(),
      teamCount: t._count.teams,
      matchCount: playable.length,
      finishedCount: finished.length,
      champion,
    };
  });
}

export async function getTournament(id: number): Promise<TournamentDetail | null> {
  const t = await prisma.tournament.findUnique({
    where: { id },
    include: {
      teams: { orderBy: { seed: "asc" } },
      matches: { orderBy: [{ round: "asc" }, { position: "asc" }] },
    },
  });
  if (!t) return null;

  const teams: TeamDTO[] = t.teams.map(({ id, name, seed }) => ({ id, name, seed }));
  const byId = new Map(teams.map((team) => [team.id, team]));
  const matches: MatchDTO[] = t.matches.map((m) => ({
    id: m.id,
    round: m.round,
    position: m.position,
    teamA: m.teamAId !== null ? (byId.get(m.teamAId) ?? null) : null,
    teamB: m.teamBId !== null ? (byId.get(m.teamBId) ?? null) : null,
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    winnerId: m.winnerId,
    bye: m.bye,
  }));

  const format = toFormat(t.format);
  const rounds = Math.max(0, ...matches.map((m) => m.round));
  const table = standings(
    teams.map((team) => team.id),
    t.matches,
  );

  let champion: TeamDTO | null = null;
  if (format === "ELIMINACION") {
    const final = matches.find((m) => m.round === rounds);
    champion = final?.winnerId != null ? (byId.get(final.winnerId) ?? null) : null;
  } else {
    const playable = matches.filter(isPlayable);
    if (playable.length > 0 && playable.every((m) => m.winnerId !== null)) {
      champion = byId.get(table[0].teamId) ?? null;
    }
  }

  return { id: t.id, name: t.name, format, target: t.target, teams, matches, rounds, standings: table, champion };
}

export interface MatchDetail {
  id: number;
  tournamentId: number;
  tournamentName: string;
  format: Format;
  target: number;
  round: number;
  rounds: number;
  teamA: TeamDTO | null;
  teamB: TeamDTO | null;
  scoreA: number;
  scoreB: number;
  winnerId: number | null;
  bye: boolean;
}

export async function getMatch(tournamentId: number, matchId: number): Promise<MatchDetail | null> {
  const m = await prisma.match.findFirst({
    where: { id: matchId, tournamentId },
    include: { tournament: true, teamA: true, teamB: true },
  });
  if (!m) return null;
  const { _max } = await prisma.match.aggregate({ where: { tournamentId }, _max: { round: true } });
  const team = (t: { id: number; name: string; seed: number } | null) => (t ? { id: t.id, name: t.name, seed: t.seed } : null);

  return {
    id: m.id,
    tournamentId,
    tournamentName: m.tournament.name,
    format: toFormat(m.tournament.format),
    target: m.tournament.target,
    round: m.round,
    rounds: _max.round ?? m.round,
    teamA: team(m.teamA),
    teamB: team(m.teamB),
    scoreA: m.scoreA,
    scoreB: m.scoreB,
    winnerId: m.winnerId,
    bye: m.bye,
  };
}
