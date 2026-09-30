import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { STAGE_LABELS, STAGE_STYLES, STAGES, type Stage } from "@/lib/stages";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight md:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {actions}
    </div>
  );
}

export function Card({ className = "", ...props }: ComponentProps<"section">) {
  return <section className={`rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:p-5 ${className}`} {...props} />;
}

export function StageBadge({ stage }: { stage: Stage }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${STAGE_STYLES[stage].badge}`}>
      <span className={`size-1.5 rounded-full ${STAGE_STYLES[stage].dot}`} />
      {STAGE_LABELS[stage]}
    </span>
  );
}

export function StageCounters({ counts, href }: { counts: Record<Stage, number>; href?: (stage: Stage) => string }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {STAGES.map((stage) => {
        const content = (
          <>
            <div className="flex items-center gap-2 text-xs font-medium text-slate-500">
              <span className={`size-2 rounded-full ${STAGE_STYLES[stage].dot}`} />
              {STAGE_LABELS[stage]}
            </div>
            <div className="mt-1 text-2xl font-semibold tabular-nums">{counts[stage]}</div>
          </>
        );
        const className = "block rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm";
        return href ? (
          <Link key={stage} href={href(stage)} className={`${className} hover:border-slate-300`}>
            {content}
          </Link>
        ) : (
          <div key={stage} className={className}>
            {content}
          </div>
        );
      })}
    </div>
  );
}

export function ProgressBar({ value, max, className = "" }: { value: number; max: number; className?: string }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : 100;
  const done = value >= max;
  return (
    <div
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={value}
      className={`h-3 w-full overflow-hidden rounded-full bg-slate-100 ${className}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-500 ${done ? "bg-emerald-500" : "bg-sky-500"}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}

export const buttonStyles = {
  primary:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50",
  secondary:
    "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50",
  danger:
    "inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700 disabled:opacity-50",
  icon: "inline-flex size-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800",
};
