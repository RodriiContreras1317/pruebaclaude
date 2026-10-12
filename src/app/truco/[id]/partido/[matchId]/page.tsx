import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon } from "@/components/icons";
import { Scorer } from "@/components/truco/scorer";
import { getMatch } from "@/lib/tournaments";
import { roundName } from "@/lib/truco";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Anotador de truco" };

export default async function PartidoPage({ params }: PageProps<"/truco/[id]/partido/[matchId]">) {
  const { id, matchId } = await params;
  const [tournamentId, matchNumber] = [Number(id), Number(matchId)];
  if (!Number.isInteger(tournamentId) || !Number.isInteger(matchNumber)) notFound();
  const match = await getMatch(tournamentId, matchNumber);
  if (!match) notFound();

  const roundText = match.format === "LIGA" ? `Fecha ${match.round}` : roundName(match.round, match.rounds);

  return (
    <div className="mx-auto max-w-3xl">
      <Link
        href={`/truco/${match.tournamentId}`}
        className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800"
      >
        <ChevronLeftIcon className="size-4" />
        {match.tournamentName}
      </Link>
      <p className="mb-4 text-sm text-slate-500">
        {roundText} · a {match.target} puntos
      </p>

      {match.teamA && match.teamB && !match.bye ? (
        <Scorer
          matchId={match.id}
          tournamentId={match.tournamentId}
          target={match.target}
          teamA={match.teamA.name}
          teamB={match.teamB.name}
          scoreA={match.scoreA}
          scoreB={match.scoreB}
        />
      ) : (
        <p className="rounded-2xl bg-white p-5 text-slate-600 ring-1 ring-slate-200">
          Este partido todavía no tiene los dos equipos definidos.
        </p>
      )}
    </div>
  );
}
