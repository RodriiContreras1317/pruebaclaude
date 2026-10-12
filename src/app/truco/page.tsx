import type { Metadata } from "next";
import Link from "next/link";
import { PlusIcon, TrophyIcon } from "@/components/icons";
import { Card, PageHeader, ProgressBar, buttonStyles } from "@/components/ui";
import { getTournaments } from "@/lib/tournaments";
import { FORMAT_LABELS } from "@/lib/truco";

export const dynamic = "force-dynamic";

export const metadata: Metadata = { title: "Torneos de truco" };

export default async function TrucoPage() {
  const tournaments = await getTournaments();

  return (
    <>
      <PageHeader
        title="Torneos de truco"
        subtitle="Armá el fixture y anotá los partidos con fósforos."
        actions={
          <Link href="/truco/nuevo" className={buttonStyles.primary}>
            <PlusIcon className="size-4" />
            Nuevo torneo
          </Link>
        }
      />

      {tournaments.length === 0 ? (
        <Card className="text-center">
          <p className="text-slate-600">Todavía no hay torneos.</p>
          <Link href="/truco/nuevo" className={`${buttonStyles.primary} mt-4`}>
            Crear el primero
          </Link>
        </Card>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {tournaments.map((t) => (
            <li key={t.id}>
              <Link href={`/truco/${t.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm hover:border-slate-400 md:p-5">
                <h2 className="font-semibold">{t.name}</h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  {FORMAT_LABELS[t.format]} · a {t.target} · {t.teamCount} equipos
                </p>
                <div className="mt-3 flex items-center gap-3">
                  <ProgressBar value={t.finishedCount} max={t.matchCount} className="h-2" />
                  <span className="shrink-0 text-xs tabular-nums text-slate-500">
                    {t.finishedCount}/{t.matchCount} partidos
                  </span>
                </div>
                {t.champion && (
                  <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-emerald-700">
                    <TrophyIcon className="size-4" />
                    Campeón: {t.champion}
                  </p>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
