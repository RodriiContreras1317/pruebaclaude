import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeftIcon, TrophyIcon } from "@/components/icons";
import { DeleteTournamentButton } from "@/components/truco/delete-tournament-button";
import { MatchCard } from "@/components/truco/match-card";
import { PageHeader } from "@/components/ui";
import { getTournament, type TournamentDetail } from "@/lib/tournaments";
import { FORMAT_LABELS, roundName } from "@/lib/truco";

export const dynamic = "force-dynamic";

async function load(params: Promise<{ id: string }>) {
  const { id } = await params;
  const tournamentId = Number(id);
  if (!Number.isInteger(tournamentId)) notFound();
  const tournament = await getTournament(tournamentId);
  if (!tournament) notFound();
  return tournament;
}

export async function generateMetadata({ params }: PageProps<"/truco/[id]">): Promise<Metadata> {
  const tournament = await load(params);
  return { title: tournament.name };
}

export default async function TorneoPage({ params }: PageProps<"/truco/[id]">) {
  const tournament = await load(params);

  return (
    <>
      <Link href="/truco" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-800">
        <ChevronLeftIcon className="size-4" />
        Torneos
      </Link>
      <PageHeader
        title={tournament.name}
        subtitle={`${FORMAT_LABELS[tournament.format]} · a ${tournament.target} puntos · ${tournament.teams.length} equipos`}
        actions={<DeleteTournamentButton id={tournament.id} name={tournament.name} />}
      />

      {tournament.champion && (
        <div className="mb-6 flex items-center gap-3 rounded-2xl bg-emerald-50 px-4 py-4 ring-1 ring-emerald-200">
          <TrophyIcon className="size-8 shrink-0 text-emerald-600" />
          <div>
            <p className="text-xs font-medium tracking-wide text-emerald-700 uppercase">Campeón</p>
            <p className="text-lg font-semibold text-emerald-900">{tournament.champion.name}</p>
          </div>
        </div>
      )}

      {tournament.format === "LIGA" ? <League tournament={tournament} /> : <Bracket tournament={tournament} />}
    </>
  );
}

function League({ tournament }: { tournament: TournamentDetail }) {
  const names = new Map(tournament.teams.map((t) => [t.id, t.name]));
  const rounds = Array.from({ length: tournament.rounds }, (_, i) => i + 1);

  return (
    <>
      <section className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
        <h2 className="px-4 pt-4 font-semibold md:px-5">Tabla de posiciones</h2>
        <table className="mt-2 w-full text-sm tabular-nums">
          <thead className="text-xs text-slate-500">
            <tr className="border-b border-slate-100">
              <th className="px-4 py-2 text-left font-medium md:px-5">#</th>
              <th className="w-full py-2 text-left font-medium">Equipo</th>
              <th className="px-2 py-2 font-medium" title="Partidos jugados">PJ</th>
              <th className="px-2 py-2 font-medium" title="Partidos ganados">PG</th>
              <th className="px-2 py-2 font-medium" title="Partidos perdidos">PP</th>
              <th className="hidden px-2 py-2 font-medium sm:table-cell" title="Tantos a favor">TF</th>
              <th className="hidden px-2 py-2 font-medium sm:table-cell" title="Tantos en contra">TC</th>
              <th className="px-4 py-2 font-medium md:px-5" title="Diferencia de tantos">Dif</th>
            </tr>
          </thead>
          <tbody>
            {tournament.standings.map((row, i) => (
              <tr key={row.teamId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-2.5 text-slate-500 md:px-5">{i + 1}</td>
                <td className="max-w-0 truncate py-2.5 font-medium">{names.get(row.teamId)}</td>
                <td className="px-2 py-2.5 text-center">{row.played}</td>
                <td className="px-2 py-2.5 text-center font-semibold">{row.won}</td>
                <td className="px-2 py-2.5 text-center">{row.lost}</td>
                <td className="hidden px-2 py-2.5 text-center sm:table-cell">{row.pointsFor}</td>
                <td className="hidden px-2 py-2.5 text-center sm:table-cell">{row.pointsAgainst}</td>
                <td className="px-4 py-2.5 text-center md:px-5">{row.diff > 0 ? `+${row.diff}` : row.diff}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 pb-4 text-xs text-slate-500 md:px-5">
          Se ordena por partidos ganados, después por diferencia de tantos y después por tantos a favor.
        </p>
      </section>

      <h2 className="mt-8 mb-3 font-semibold">Fixture</h2>
      <div className="space-y-6">
        {rounds.map((round) => {
          const matches = tournament.matches.filter((m) => m.round === round);
          const playing = new Set(matches.flatMap((m) => [m.teamA?.id, m.teamB?.id]));
          const free = tournament.teams.filter((t) => !playing.has(t.id));
          return (
            <section key={round}>
              <h3 className="mb-2 text-sm font-medium text-slate-500">
                Fecha {round}
                {free.length > 0 && <span className="font-normal"> · libre: {free.map((t) => t.name).join(", ")}</span>}
              </h3>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {matches.map((m) => (
                  <MatchCard key={m.id} tournamentId={tournament.id} match={m} />
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </>
  );
}

function Bracket({ tournament }: { tournament: TournamentDetail }) {
  const rounds = Array.from({ length: tournament.rounds }, (_, i) => i + 1);
  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <div className="flex min-w-max gap-4">
        {rounds.map((round) => (
          <section key={round} className="flex w-56 flex-col">
            <h2 className="mb-3 text-sm font-semibold text-slate-600">{roundName(round, tournament.rounds)}</h2>
            <div className="flex flex-1 flex-col justify-around gap-3">
              {tournament.matches
                .filter((m) => m.round === round)
                .map((m) => (
                  <MatchCard key={m.id} tournamentId={tournament.id} match={m} />
                ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
