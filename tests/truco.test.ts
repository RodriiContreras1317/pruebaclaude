import { describe, expect, it } from "vitest";
import {
  applyPoints,
  buildBracket,
  nextSlot,
  parseTeamNames,
  roundName,
  roundRobin,
  scoreLabel,
  seedOrder,
  shuffle,
  standings,
  winnerSide,
  type MatchResult,
} from "@/lib/truco";

describe("puntaje", () => {
  it("no baja de 0 ni pasa del objetivo", () => {
    expect(applyPoints(0, -1, 30)).toBe(0);
    expect(applyPoints(28, 3, 30)).toBe(30);
    expect(applyPoints(10, 2, 15)).toBe(12);
  });

  it("gana el primero que llega al objetivo", () => {
    expect(winnerSide(30, 12, 30)).toBe("A");
    expect(winnerSide(3, 15, 15)).toBe("B");
    expect(winnerSide(29, 29, 30)).toBeNull();
  });

  it("canta malas y buenas a 30", () => {
    expect(scoreLabel(0, 30)).toBe("0");
    expect(scoreLabel(1, 30)).toBe("1 mala");
    expect(scoreLabel(15, 30)).toBe("15 malas");
    expect(scoreLabel(16, 30)).toBe("1 buena");
    expect(scoreLabel(30, 30)).toBe("15 buenas");
    expect(scoreLabel(7, 15)).toBe("7 puntos");
  });
});

describe("roundRobin", () => {
  function checkAllPlayOnce(n: number) {
    const teams = Array.from({ length: n }, (_, i) => i + 1);
    const pairings = roundRobin(teams);
    expect(pairings).toHaveLength((n * (n - 1)) / 2);

    const seen = new Set(pairings.map((p) => [p.a, p.b].sort().join("-")));
    expect(seen.size).toBe(pairings.length);

    // Nadie juega dos veces en la misma fecha.
    const rounds = new Map<number, number[]>();
    for (const p of pairings) rounds.set(p.round, [...(rounds.get(p.round) ?? []), p.a, p.b]);
    for (const ids of rounds.values()) expect(new Set(ids).size).toBe(ids.length);
    expect(rounds.size).toBe(n % 2 === 0 ? n - 1 : n);
  }

  it.each([2, 3, 4, 5, 6, 7, 8, 11])("%i equipos juegan todos contra todos una vez", checkAllPlayOnce);

  it("numera las posiciones dentro de cada fecha", () => {
    const pairings = roundRobin([1, 2, 3, 4, 5]);
    for (const round of [1, 2, 3, 4, 5]) {
      expect(pairings.filter((p) => p.round === round).map((p) => p.position)).toEqual([0, 1]);
    }
  });
});

describe("buildBracket", () => {
  it("orden de cabezas de serie", () => {
    expect(seedOrder(2)).toEqual([1, 2]);
    expect(seedOrder(4)).toEqual([1, 4, 2, 3]);
    expect(seedOrder(8)).toEqual([1, 8, 4, 5, 2, 7, 3, 6]);
  });

  it("8 equipos: cuartos, semis y final sin byes", () => {
    const slots = buildBracket(["A", "B", "C", "D", "E", "F", "G", "H"]);
    expect(slots).toHaveLength(7);
    expect(slots.filter((s) => s.round === 1).map((s) => [s.a, s.b])).toEqual([
      ["A", "H"],
      ["D", "E"],
      ["B", "G"],
      ["C", "F"],
    ]);
    expect(slots.some((s) => s.bye)).toBe(false);
  });

  it("6 equipos: los dos primeros pasan directo a semifinales", () => {
    const slots = buildBracket(["A", "B", "C", "D", "E", "F"]);
    const first = slots.filter((s) => s.round === 1);
    expect(first.filter((s) => s.bye).map((s) => s.winner)).toEqual(["A", "B"]);
    expect(first.filter((s) => !s.bye).map((s) => [s.a, s.b])).toEqual([
      ["D", "E"],
      ["C", "F"],
    ]);
    const semis = slots.filter((s) => s.round === 2);
    expect(semis.map((s) => [s.a, s.b])).toEqual([
      ["A", null],
      ["B", null],
    ]);
  });

  it("2 equipos: solo la final", () => {
    expect(buildBracket(["A", "B"])).toEqual([{ round: 1, position: 0, a: "A", b: "B", bye: false, winner: null }]);
  });

  it("ningún partido de primera ronda queda sin equipos", () => {
    for (let n = 2; n <= 33; n++) {
      const slots = buildBracket(Array.from({ length: n }, (_, i) => i));
      expect(slots.filter((s) => s.round === 1).every((s) => s.a !== null || s.b !== null)).toBe(true);
    }
  });

  it("siguiente partido y nombre de las rondas", () => {
    expect(nextSlot(1, 0, 3)).toEqual({ round: 2, position: 0, side: "A" });
    expect(nextSlot(1, 3, 3)).toEqual({ round: 2, position: 1, side: "B" });
    expect(nextSlot(3, 0, 3)).toBeNull();
    expect([1, 2, 3, 4].map((r) => roundName(r, 4))).toEqual(["Octavos de final", "Cuartos de final", "Semifinal", "Final"]);
    expect(roundName(1, 6)).toBe("Ronda 1");
  });
});

describe("standings", () => {
  const match = (a: number, b: number, scoreA: number, scoreB: number): MatchResult => ({
    teamAId: a,
    teamBId: b,
    scoreA,
    scoreB,
    winnerId: scoreA > scoreB ? a : b,
    bye: false,
  });

  it("ordena por ganados, diferencia y tantos a favor", () => {
    const rows = standings(
      [1, 2, 3, 4],
      [
        match(1, 2, 30, 20), // 1 gana por 10
        match(3, 4, 30, 10), // 3 gana por 20
        match(1, 3, 30, 29),
        match(2, 4, 30, 25),
      ],
    );
    expect(rows.map((r) => r.teamId)).toEqual([1, 3, 2, 4]);
    expect(rows[0]).toMatchObject({ played: 2, won: 2, lost: 0, pointsFor: 60, pointsAgainst: 49, diff: 11 });
    expect(rows[3]).toMatchObject({ played: 2, won: 0, lost: 2, diff: -25 });
  });

  it("ignora los partidos sin terminar", () => {
    const rows = standings([1, 2], [{ teamAId: 1, teamBId: 2, scoreA: 12, scoreB: 3, winnerId: null, bye: false }]);
    expect(rows.every((r) => r.played === 0)).toBe(true);
    expect(rows.map((r) => r.teamId)).toEqual([1, 2]);
  });
});

describe("utilidades", () => {
  it("parsea un equipo por renglón", () => {
    expect(parseTeamNames("  Los Pibes \n\nLas  Chicas\r\n  ")).toEqual(["Los Pibes", "Las Chicas"]);
  });

  it("shuffle mantiene los elementos", () => {
    const items = [1, 2, 3, 4, 5];
    expect(shuffle(items, () => 0.3).sort()).toEqual(items);
  });
});
