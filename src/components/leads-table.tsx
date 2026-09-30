"use client";

import { useMemo, useState } from "react";
import { formatDate } from "@/lib/dates";
import type { LeadDTO } from "@/lib/leads";
import { formatArPhone } from "@/lib/phone";
import { STAGE_LABELS, STAGES, type Stage } from "@/lib/stages";
import { SearchIcon } from "./icons";
import { LeadActions } from "./lead-actions";
import { StageBadge } from "./ui";

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();
}

function matches(lead: LeadDTO, query: string) {
  const q = query.trim();
  if (!q) return true;
  if (normalizeText(lead.fullName).includes(normalizeText(q))) return true;

  // Búsqueda por teléfono: se comparan solo los dígitos, ignorando el 0 inicial.
  const digits = q.replace(/\D/g, "").replace(/^0/, "");
  return digits.length >= 3 && lead.phone.replace(/\D/g, "").includes(digits);
}

export function LeadsTable({ leads, initialStage }: { leads: LeadDTO[]; initialStage?: Stage }) {
  const [query, setQuery] = useState("");
  const [stage, setStage] = useState<Stage | "">(initialStage ?? "");

  const filtered = useMemo(
    () => leads.filter((l) => (!stage || l.stage === stage) && matches(l, query)),
    [leads, stage, query],
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <label className="relative flex-1">
          <span className="sr-only">Buscar por nombre o teléfono</span>
          <SearchIcon className="pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2 text-slate-400" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre o teléfono"
            className="w-full rounded-lg border border-slate-300 bg-white py-2.5 pr-3 pl-10 text-base shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 md:text-sm"
          />
        </label>
        <label>
          <span className="sr-only">Filtrar por etapa</span>
          <select
            value={stage}
            onChange={(e) => setStage(e.target.value as Stage | "")}
            className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base shadow-sm sm:w-48 md:text-sm"
          >
            <option value="">Todas las etapas</option>
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {STAGE_LABELS[s]}
              </option>
            ))}
          </select>
        </label>
      </div>

      <p className="text-sm text-slate-500" aria-live="polite">
        {filtered.length === leads.length
          ? `${leads.length} leads`
          : `${filtered.length} de ${leads.length} leads`}
      </p>

      {filtered.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
          No hay leads que coincidan con la búsqueda.
        </p>
      ) : (
        <>
          {/* Celular: lista de tarjetas */}
          <ul className="space-y-2 md:hidden">
            {filtered.map((lead) => (
              <li key={lead.id} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{lead.fullName}</p>
                    <p className="text-sm tabular-nums text-slate-500">{formatArPhone(lead.phone)}</p>
                  </div>
                  <StageBadge stage={lead.stage} />
                </div>
                {lead.notes && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{lead.notes}</p>}
                <div className="mt-2 flex items-center justify-between">
                  <p className="text-xs text-slate-400">
                    Creado {formatDate(lead.createdAt)}
                    {lead.soldAt && ` · Vendido ${formatDate(lead.soldAt)}`}
                  </p>
                  <LeadActions lead={lead} />
                </div>
              </li>
            ))}
          </ul>

          {/* Escritorio: tabla */}
          <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs font-medium tracking-wide text-slate-500 uppercase">
                <tr>
                  <th className="px-4 py-3">Nombre</th>
                  <th className="px-4 py-3">Teléfono</th>
                  <th className="px-4 py-3">Etapa</th>
                  <th className="px-4 py-3">Notas</th>
                  <th className="px-4 py-3">Creado</th>
                  <th className="px-4 py-3">Venta</th>
                  <th className="px-4 py-3">
                    <span className="sr-only">Acciones</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((lead) => (
                  <tr key={lead.id} className="hover:bg-slate-50/60">
                    <td className="px-4 py-3 font-medium">{lead.fullName}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-600">{formatArPhone(lead.phone)}</td>
                    <td className="px-4 py-3">
                      <StageBadge stage={lead.stage} />
                    </td>
                    <td className="max-w-xs px-4 py-3 text-slate-600">
                      <span className="line-clamp-2">{lead.notes ?? "—"}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-500">{formatDate(lead.createdAt)}</td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-slate-500">
                      {lead.soldAt ? formatDate(lead.soldAt) : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <LeadActions lead={lead} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
