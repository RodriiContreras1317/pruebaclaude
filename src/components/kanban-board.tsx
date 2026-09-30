"use client";

import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { useOptimistic, useState, useTransition } from "react";
import { updateLeadStage } from "@/app/leads/actions";
import { formatDate } from "@/lib/dates";
import type { LeadDTO } from "@/lib/leads";
import { formatArPhone } from "@/lib/phone";
import { isStage, STAGE_LABELS, STAGE_STYLES, STAGES, type Stage } from "@/lib/stages";
import { GripIcon } from "./icons";
import { LeadActions } from "./lead-actions";

type Move = { id: number; stage: Stage };

export function KanbanBoard({ leads }: { leads: LeadDTO[] }) {
  const [optimisticLeads, applyMove] = useOptimistic(leads, (state, { id, stage }: Move) =>
    state.map((l) => (l.id === id ? { ...l, stage } : l)),
  );
  const [, startTransition] = useTransition();
  const [activeId, setActiveId] = useState<number | null>(null);

  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 6 } }),
    // En pantallas táctiles se arrastra con una pulsación larga, así el scroll sigue funcionando.
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  function move(id: number, stage: Stage) {
    const lead = optimisticLeads.find((l) => l.id === id);
    if (!lead || lead.stage === stage) return;
    startTransition(async () => {
      applyMove({ id, stage });
      await updateLeadStage(id, stage);
    });
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(Number(e.active.id));
  }

  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const stage = e.over?.id;
    if (isStage(stage)) move(Number(e.active.id), stage);
  }

  const activeLead = optimisticLeads.find((l) => l.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setActiveId(null)}
      accessibility={{
        screenReaderInstructions: {
          draggable:
            "Para mover un lead, presioná espacio o enter, usá las flechas para elegir la columna y presioná espacio o enter de nuevo. Escape cancela.",
        },
      }}
    >
      <div className="-mx-4 flex items-start snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-4 md:mx-0 md:grid md:grid-cols-4 md:items-stretch md:overflow-visible md:px-0">
        {STAGES.map((stage) => (
          <Column
            key={stage}
            stage={stage}
            leads={optimisticLeads.filter((l) => l.stage === stage)}
            onMove={move}
          />
        ))}
      </div>
      <DragOverlay>
        {activeLead && <LeadCard lead={activeLead} onMove={move} overlay />}
      </DragOverlay>
    </DndContext>
  );
}

function Column({ stage, leads, onMove }: { stage: Stage; leads: LeadDTO[]; onMove: (id: number, s: Stage) => void }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <section
      ref={setNodeRef}
      aria-label={STAGE_LABELS[stage]}
      className={`flex w-[85%] shrink-0 snap-start flex-col rounded-2xl border p-2.5 transition-colors sm:w-[45%] md:w-auto ${
        STAGE_STYLES[stage].column
      } ${isOver ? "border-slate-400 ring-2 ring-slate-300" : "border-slate-200"}`}
    >
      <header className="mb-2 flex items-center justify-between px-1.5 pt-0.5">
        <h2 className="flex items-center gap-2 text-sm font-semibold">
          <span className={`size-2 rounded-full ${STAGE_STYLES[stage].dot}`} />
          {STAGE_LABELS[stage]}
        </h2>
        <span className="rounded-full bg-white px-2 py-0.5 text-xs font-medium tabular-nums text-slate-600 ring-1 ring-slate-200">
          {leads.length}
        </span>
      </header>
      <div className="flex min-h-32 flex-1 flex-col gap-2">
        {leads.map((lead) => (
          <DraggableCard key={lead.id} lead={lead} onMove={onMove} />
        ))}
        {leads.length === 0 && (
          <p className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-slate-300 p-4 text-center text-xs text-slate-400">
            Arrastrá un lead acá
          </p>
        )}
      </div>
    </section>
  );
}

function DraggableCard({ lead, onMove }: { lead: LeadDTO; onMove: (id: number, s: Stage) => void }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      aria-roledescription="lead arrastrable"
      className={`touch-manipulation rounded-xl outline-none focus-visible:ring-2 focus-visible:ring-slate-400 ${
        isDragging ? "opacity-40" : ""
      }`}
    >
      <LeadCard lead={lead} onMove={onMove} />
    </div>
  );
}

function LeadCard({ lead, onMove, overlay = false }: { lead: LeadDTO; onMove: (id: number, s: Stage) => void; overlay?: boolean }) {
  return (
    <article
      className={`cursor-grab rounded-xl border border-slate-200 bg-white p-3 shadow-sm active:cursor-grabbing ${
        overlay ? "rotate-2 shadow-lg" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="truncate font-medium">{lead.fullName}</h3>
          <p className="text-sm tabular-nums text-slate-500">{formatArPhone(lead.phone)}</p>
        </div>
        <GripIcon className="mt-1 size-4 shrink-0 text-slate-300" />
      </div>
      {lead.notes && <p className="mt-2 line-clamp-2 text-sm text-slate-600">{lead.notes}</p>}
      {lead.soldAt && (
        <p className="mt-2 text-xs font-medium text-emerald-700">Vendido el {formatDate(lead.soldAt)}</p>
      )}
      {/* Los controles de la tarjeta no inician el arrastre. */}
      <div
        className="mt-3 flex items-center justify-end gap-2"
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.stopPropagation()}
      >
        <select
          aria-label={`Mover a ${lead.fullName} a otra etapa`}
          value={lead.stage}
          onChange={(e) => onMove(lead.id, e.target.value as Stage)}
          className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs text-slate-600 md:hidden"
        >
          {STAGES.map((s) => (
            <option key={s} value={s}>
              {s === lead.stage ? STAGE_LABELS[s] : `Mover a ${STAGE_LABELS[s]}`}
            </option>
          ))}
        </select>
        <LeadActions lead={lead} />
      </div>
    </article>
  );
}
