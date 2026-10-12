import Link from "next/link";
import type { MatchDTO } from "@/lib/tournaments";

type Status = "BYE" | "A_DEFINIR" | "POR_JUGAR" | "EN_JUEGO" | "TERMINADO";

export function matchStatus(m: MatchDTO): Status {
  if (m.bye) return "BYE";
  if (!m.teamA || !m.teamB) return "A_DEFINIR";
  if (m.winnerId !== null) return "TERMINADO";
  if (m.scoreA > 0 || m.scoreB > 0) return "EN_JUEGO";
  return "POR_JUGAR";
}

const STATUS: Record<Status, { label: string; className: string }> = {
  BYE: { label: "Pasa directo", className: "bg-slate-100 text-slate-500" },
  A_DEFINIR: { label: "A definir", className: "bg-slate-100 text-slate-500" },
  POR_JUGAR: { label: "Por jugar", className: "bg-sky-50 text-sky-700" },
  EN_JUEGO: { label: "En juego", className: "bg-amber-50 text-amber-700" },
  TERMINADO: { label: "Terminado", className: "bg-emerald-50 text-emerald-700" },
};

export function MatchCard({ tournamentId, match }: { tournamentId: number; match: MatchDTO }) {
  const status = matchStatus(match);
  const playable = status !== "BYE" && status !== "A_DEFINIR";
  const showScores = status === "EN_JUEGO" || status === "TERMINADO";

  const row = (team: MatchDTO["teamA"], score: number) => {
    const won = team !== null && match.winnerId === team.id;
    const lost = match.winnerId !== null && !won;
    return (
      <div className={`flex items-center justify-between gap-2 ${lost ? "text-slate-400" : ""}`}>
        <span className={`truncate ${won ? "font-semibold" : ""} ${team ? "" : "text-slate-400 italic"}`}>
          {team?.name ?? (match.bye ? "—" : "A definir")}
        </span>
        {showScores && <span className={`tabular-nums ${won ? "font-semibold" : ""}`}>{score}</span>}
      </div>
    );
  };

  const content = (
    <>
      <div className="space-y-1 text-sm">
        {row(match.teamA, match.scoreA)}
        {row(match.teamB, match.scoreB)}
      </div>
      <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${STATUS[status].className}`}>
        {STATUS[status].label}
      </span>
    </>
  );

  const className = "block rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm";
  return playable ? (
    <Link
      href={`/truco/${tournamentId}/partido/${match.id}`}
      className={`${className} hover:border-slate-400`}
      aria-label={`Anotar ${match.teamA?.name} contra ${match.teamB?.name}`}
    >
      {content}
    </Link>
  ) : (
    <div className={`${className} opacity-70`}>{content}</div>
  );
}
