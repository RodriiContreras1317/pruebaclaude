"use client";

import Link from "next/link";
import { startTransition, useOptimistic, useState } from "react";
import { addPoints } from "@/app/truco/actions";
import { applyPoints, scoreLabel, winnerSide, type Side } from "@/lib/truco";
import { TrophyIcon } from "../icons";
import { buttonStyles } from "../ui";
import { Fosforos } from "./fosforos";

interface ScorerProps {
  matchId: number;
  tournamentId: number;
  target: number;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
}

type Scores = { A: number; B: number };

export function Scorer({ matchId, tournamentId, target, teamA, teamB, scoreA, scoreB }: ScorerProps) {
  const [error, setError] = useState<string | null>(null);
  const [scores, addOptimistic] = useOptimistic<Scores, { side: Side; delta: number }>(
    { A: scoreA, B: scoreB },
    (current, { side, delta }) => {
      // Mismas reglas que el servidor: terminado el partido, solo se puede restar.
      if (delta > 0 && winnerSide(current.A, current.B, target)) return current;
      return { ...current, [side]: applyPoints(current[side], delta, target) };
    },
  );

  const winner = winnerSide(scores.A, scores.B, target);
  const names: Record<Side, string> = { A: teamA, B: teamB };

  function score(side: Side, delta: number) {
    setError(null);
    startTransition(async () => {
      addOptimistic({ side, delta });
      const result = await addPoints(matchId, side, delta);
      if (result.error) setError(result.error);
    });
  }

  return (
    <div>
      {winner && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-200">
          <p className="flex items-center gap-2 font-semibold text-emerald-800">
            <TrophyIcon className="size-6" />
            ¡Ganó {names[winner]}!
          </p>
          <Link href={`/truco/${tournamentId}`} className={buttonStyles.primary}>
            Volver al torneo
          </Link>
        </div>
      )}
      {error && (
        <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700 ring-1 ring-rose-200">
          {error}
        </p>
      )}

      <div className="grid grid-cols-2 gap-3 md:gap-5">
        {(["A", "B"] as const).map((side) => (
          <TeamColumn
            key={side}
            name={names[side]}
            score={scores[side]}
            target={target}
            isWinner={winner === side}
            finished={winner !== null}
            onScore={(delta) => score(side, delta)}
          />
        ))}
      </div>

      {winner && (
        <p className="mt-4 text-center text-sm text-slate-500">
          ¿Hubo un error? Restale puntos al ganador con <strong>−1</strong> para reabrir el partido.
        </p>
      )}
    </div>
  );
}

function TeamColumn({
  name,
  score,
  target,
  isWinner,
  finished,
  onScore,
}: {
  name: string;
  score: number;
  target: number;
  isWinner: boolean;
  finished: boolean;
  onScore: (delta: number) => void;
}) {
  const small = "rounded-lg border border-slate-300 bg-white py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40";
  return (
    <section
      aria-label={name}
      className={`flex flex-col rounded-2xl border bg-white p-3 shadow-sm md:p-5 ${isWinner ? "border-emerald-400 ring-2 ring-emerald-200" : "border-slate-200"}`}
    >
      <h2 className="truncate text-center text-base font-semibold md:text-lg" title={name}>
        {name}
      </h2>
      <p className="mt-1 text-center text-5xl font-bold tabular-nums md:text-6xl" aria-live="polite">
        {score}
      </p>
      <p className="text-center text-sm text-slate-500">{scoreLabel(score, target)}</p>

      <div className="my-4 flex flex-1 justify-center">
        <Fosforos score={score} target={target} />
      </div>

      <button
        type="button"
        onClick={() => onScore(1)}
        disabled={finished}
        className="w-full rounded-xl bg-slate-900 py-4 text-2xl font-bold text-white hover:bg-slate-800 active:scale-[0.98] disabled:opacity-40"
        aria-label={`Sumar 1 punto a ${name}`}
      >
        +1
      </button>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        <button type="button" onClick={() => onScore(-1)} disabled={score === 0} className={small} aria-label={`Restar 1 punto a ${name}`}>
          −1
        </button>
        <button type="button" onClick={() => onScore(2)} disabled={finished} className={small} aria-label={`Sumar 2 puntos a ${name}`}>
          +2
        </button>
        <button type="button" onClick={() => onScore(3)} disabled={finished} className={small} aria-label={`Sumar 3 puntos a ${name}`}>
          +3
        </button>
      </div>
    </section>
  );
}
