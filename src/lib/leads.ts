import type { Lead } from "@prisma/client";
import { prisma } from "./db";
import { isStage, STAGES, type Stage } from "./stages";

/** Lead serializable para pasar a componentes de cliente. */
export interface LeadDTO {
  id: number;
  fullName: string;
  phone: string;
  stage: Stage;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  soldAt: string | null;
}

export function toDTO(lead: Lead): LeadDTO {
  return {
    id: lead.id,
    fullName: lead.fullName,
    phone: lead.phone,
    stage: isStage(lead.stage) ? lead.stage : "NO_VENDIDO",
    notes: lead.notes,
    createdAt: lead.createdAt.toISOString(),
    updatedAt: lead.updatedAt.toISOString(),
    soldAt: lead.soldAt?.toISOString() ?? null,
  };
}

export async function getLeads(): Promise<LeadDTO[]> {
  const leads = await prisma.lead.findMany({ orderBy: { updatedAt: "desc" } });
  return leads.map(toDTO);
}

export async function getLead(id: number): Promise<LeadDTO | null> {
  const lead = await prisma.lead.findUnique({ where: { id } });
  return lead ? toDTO(lead) : null;
}

export async function getStageCounts(): Promise<Record<Stage, number>> {
  const groups = await prisma.lead.groupBy({ by: ["stage"], _count: { _all: true } });
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const g of groups) if (isStage(g.stage)) counts[g.stage] = g._count._all;
  return counts;
}

/** Leads para contactar: primero "Posible compra", luego "Seguimiento"; dentro de cada etapa, los que llevan más tiempo sin cambios. */
export async function getPriorityLeads(): Promise<LeadDTO[]> {
  const leads = await prisma.lead.findMany({
    where: { stage: { in: ["POSIBLE_COMPRA", "SEGUIMIENTO"] } },
    orderBy: { updatedAt: "asc" },
  });
  const rank = (stage: string) => (stage === "POSIBLE_COMPRA" ? 0 : 1);
  return leads.sort((a, b) => rank(a.stage) - rank(b.stage)).map(toDTO);
}

export function countByStage(leads: LeadDTO[]): Record<Stage, number> {
  const counts = Object.fromEntries(STAGES.map((s) => [s, 0])) as Record<Stage, number>;
  for (const lead of leads) counts[lead.stage]++;
  return counts;
}
