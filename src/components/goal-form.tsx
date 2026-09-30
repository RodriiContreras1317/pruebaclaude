"use client";

import { useActionState, useState } from "react";
import { saveMonthlyGoal, type GoalFormState } from "@/app/objetivos/actions";
import { buttonStyles } from "./ui";

export function GoalForm({ year, month, goal }: { year: number; month: number; goal: number }) {
  const [state, formAction, pending] = useActionState<GoalFormState, FormData>(saveMonthlyGoal, {});
  const [value, setValue] = useState(String(goal));

  return (
    <form action={formAction} className="flex flex-wrap items-end gap-2">
      <input type="hidden" name="year" value={year} />
      <input type="hidden" name="month" value={month} />
      <label className="text-sm font-medium">
        Objetivo de ventas
        <input
          name="target"
          type="number"
          inputMode="numeric"
          min={1}
          step={1}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          aria-invalid={!!state.error}
          className="mt-1 block w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-base tabular-nums shadow-sm outline-none focus:border-slate-500 focus:ring-2 focus:ring-slate-200 md:text-sm"
        />
      </label>
      <button type="submit" className={buttonStyles.primary} disabled={pending || value === String(goal)}>
        {pending ? "Guardando…" : "Guardar"}
      </button>
      {state.error && <p className="w-full text-sm text-rose-600">{state.error}</p>}
    </form>
  );
}
