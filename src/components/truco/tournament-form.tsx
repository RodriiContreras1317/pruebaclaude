"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { createTournament, type TournamentFormState } from "@/app/truco/actions";
import { FORMAT_LABELS, FORMATS, MAX_TEAMS, parseTeamNames, TARGETS, type Format } from "@/lib/truco";
import { buttonStyles } from "../ui";

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 aria-invalid:border-rose-400 aria-invalid:ring-rose-100 md:text-sm";

const FORMAT_HELP: Record<Format, string> = {
  LIGA: "Cada equipo juega una vez contra todos. Gana el que más partidos gana.",
  ELIMINACION: "El que pierde queda afuera. Si los equipos no son 4, 8, 16…, los primeros pasan directo a la segunda ronda.",
};

export function TournamentForm() {
  const [state, formAction, pending] = useActionState<TournamentFormState, FormData>(createTournament, {});
  const [values, setValues] = useState({ name: "", format: "LIGA" as Format, target: "30", teams: "", shuffle: true });
  const errors = state.errors ?? {};
  const teamCount = parseTeamNames(values.teams).length;
  const matchCount =
    values.format === "LIGA" ? (teamCount * (teamCount - 1)) / 2 : Math.max(0, teamCount - 1);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <div>
        <label htmlFor="name" className="text-sm font-medium">
          Nombre del torneo <span className="text-rose-600">*</span>
        </label>
        <input
          id="name"
          name="name"
          placeholder="Torneo del club, sábado 17"
          value={values.name}
          onChange={(e) => setValues((v) => ({ ...v, name: e.target.value }))}
          aria-invalid={!!errors.name}
          className={inputClass}
        />
        <FieldError messages={errors.name} />
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Formato</legend>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {FORMATS.map((format) => (
            <label
              key={format}
              className="flex cursor-pointer gap-3 rounded-xl border border-slate-300 bg-white p-3 has-checked:border-slate-900 has-checked:ring-2 has-checked:ring-slate-200"
            >
              <input
                type="radio"
                name="format"
                value={format}
                checked={values.format === format}
                onChange={() => setValues((v) => ({ ...v, format }))}
                className="mt-1 accent-slate-900"
              />
              <span>
                <span className="block text-sm font-medium">{FORMAT_LABELS[format]}</span>
                <span className="block text-xs text-slate-500">{FORMAT_HELP[format]}</span>
              </span>
            </label>
          ))}
        </div>
        <FieldError messages={errors.format} />
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">Cada partido se juega a</legend>
        <div className="mt-2 flex gap-2">
          {TARGETS.map((target) => (
            <label
              key={target}
              className="cursor-pointer rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium has-checked:border-slate-900 has-checked:bg-slate-900 has-checked:text-white"
            >
              <input
                type="radio"
                name="target"
                value={target}
                checked={values.target === String(target)}
                onChange={() => setValues((v) => ({ ...v, target: String(target) }))}
                className="sr-only"
              />
              {target} puntos{target === 30 && " (malas y buenas)"}
            </label>
          ))}
        </div>
        <FieldError messages={errors.target} />
      </fieldset>

      <div>
        <label htmlFor="teams" className="text-sm font-medium">
          Equipos <span className="text-rose-600">*</span>
        </label>
        <textarea
          id="teams"
          name="teams"
          rows={8}
          placeholder={"Juan y Pedro\nLos del fondo\nLas Chinas\nEl Ancho de Espadas"}
          value={values.teams}
          onChange={(e) => setValues((v) => ({ ...v, teams: e.target.value }))}
          aria-invalid={!!errors.teams}
          aria-describedby="teams-help"
          className={inputClass}
        />
        <p id="teams-help" className="mt-1 text-xs text-slate-500">
          Un equipo por renglón (hasta {MAX_TEAMS}).{" "}
          {teamCount > 0 && (
            <strong className="text-slate-700">
              {teamCount} {teamCount === 1 ? "equipo" : "equipos"} · {matchCount}{" "}
              {matchCount === 1 ? "partido" : "partidos"}
            </strong>
          )}
        </p>
        <FieldError messages={errors.teams} />
      </div>

      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="shuffle"
          checked={values.shuffle}
          onChange={(e) => setValues((v) => ({ ...v, shuffle: e.target.checked }))}
          className="size-4 accent-slate-900"
        />
        Sortear el orden de los equipos
      </label>

      <div className="flex justify-end gap-2">
        <Link href="/truco" className={buttonStyles.secondary}>
          Cancelar
        </Link>
        <button type="submit" className={buttonStyles.primary} disabled={pending}>
          {pending ? "Creando…" : "Crear torneo"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ messages }: { messages?: string[] }) {
  if (!messages?.length) return null;
  return <p className="mt-1 text-sm text-rose-600">{messages[0]}</p>;
}
