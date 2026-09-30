"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveLead, type LeadFormState } from "@/app/leads/actions";
import type { LeadDTO } from "@/lib/leads";
import { formatArPhone } from "@/lib/phone";
import { STAGE_LABELS, STAGES, type Stage } from "@/lib/stages";
import { buttonStyles } from "./ui";

const inputClass =
  "mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 aria-invalid:border-rose-400 aria-invalid:ring-rose-100 md:text-sm";

export function LeadForm({ lead }: { lead?: LeadDTO }) {
  const [state, formAction, pending] = useActionState<LeadFormState, FormData>(saveLead, {});
  // Campos controlados para no perder lo escrito si la validación falla.
  const [values, setValues] = useState({
    fullName: lead?.fullName ?? "",
    phone: lead ? formatArPhone(lead.phone) : "",
    stage: (lead?.stage ?? "NO_VENDIDO") as Stage,
    notes: lead?.notes ?? "",
  });
  const set = (field: keyof typeof values) => (e: { target: { value: string } }) =>
    setValues((v) => ({ ...v, [field]: e.target.value }));

  const errors = state.errors ?? {};

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {lead && <input type="hidden" name="id" value={lead.id} />}

      <div>
        <label htmlFor="fullName" className="text-sm font-medium">
          Nombre completo <span className="text-rose-600">*</span>
        </label>
        <input
          id="fullName"
          name="fullName"
          autoComplete="name"
          required
          value={values.fullName}
          onChange={set("fullName")}
          aria-invalid={!!errors.fullName}
          aria-describedby="fullName-error"
          className={inputClass}
        />
        <FieldError id="fullName-error" messages={errors.fullName} />
      </div>

      <div>
        <label htmlFor="phone" className="text-sm font-medium">
          Teléfono <span className="text-rose-600">*</span>
        </label>
        <input
          id="phone"
          name="phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          placeholder="11 2345-6789 o +54 9 11 2345-6789"
          required
          value={values.phone}
          onChange={set("phone")}
          aria-invalid={!!errors.phone}
          aria-describedby="phone-help phone-error"
          className={inputClass}
        />
        <p id="phone-help" className="mt-1 text-xs text-slate-500">
          Número de Argentina, con o sin +54. Se acepta con 0 y 15.
        </p>
        <FieldError id="phone-error" messages={errors.phone} />
      </div>

      <div>
        <label htmlFor="stage" className="text-sm font-medium">
          Etapa <span className="text-rose-600">*</span>
        </label>
        <select
          id="stage"
          name="stage"
          value={values.stage}
          onChange={set("stage")}
          aria-invalid={!!errors.stage}
          className={inputClass}
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {STAGE_LABELS[s]}
            </option>
          ))}
        </select>
        <FieldError messages={errors.stage} />
        {values.stage === "VENDIDO" && lead?.stage !== "VENDIDO" && (
          <p className="mt-1 text-xs text-emerald-700">Se va a registrar la fecha de venta de hoy.</p>
        )}
        {lead?.stage === "VENDIDO" && values.stage !== "VENDIDO" && (
          <p className="mt-1 text-xs text-amber-700">Se va a borrar la fecha de venta.</p>
        )}
      </div>

      <div>
        <label htmlFor="notes" className="text-sm font-medium">
          Notas
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={4}
          value={values.notes}
          onChange={set("notes")}
          aria-invalid={!!errors.notes}
          className={inputClass}
        />
        <FieldError messages={errors.notes} />
      </div>

      {state.message && (
        <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          {state.message}
        </p>
      )}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Link href="/leads" className={buttonStyles.secondary}>
          Cancelar
        </Link>
        <button type="submit" className={buttonStyles.primary} disabled={pending}>
          {pending ? "Guardando…" : lead ? "Guardar cambios" : "Crear lead"}
        </button>
      </div>
    </form>
  );
}

function FieldError({ id, messages }: { id?: string; messages?: string[] }) {
  if (!messages?.length) return null;
  return (
    <p id={id} className="mt-1 text-sm text-rose-600">
      {messages[0]}
    </p>
  );
}
