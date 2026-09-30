import Link from "next/link";
import { KanbanBoard } from "@/components/kanban-board";
import { LeadsTable } from "@/components/leads-table";
import { PlusIcon } from "@/components/icons";
import { buttonStyles, PageHeader, StageCounters } from "@/components/ui";
import { countByStage, getLeads } from "@/lib/leads";
import { isStage } from "@/lib/stages";

export const dynamic = "force-dynamic";

export default async function LeadsPage({ searchParams }: PageProps<"/leads">) {
  const params = await searchParams;
  const view = params.vista === "tabla" ? "tabla" : "kanban";
  const stage = isStage(params.etapa) ? params.etapa : undefined;
  const leads = await getLeads();

  const tabClass =
    "rounded-md px-3 py-1.5 text-sm font-medium text-slate-600 aria-[current=page]:bg-white aria-[current=page]:text-slate-900 aria-[current=page]:shadow-sm";

  return (
    <>
      <PageHeader
        title="Leads"
        subtitle="Arrastrá los leads entre etapas o usá la vista de tabla para buscar."
        actions={
          <Link href="/leads/nuevo" className={buttonStyles.primary}>
            <PlusIcon className="size-4" />
            Nuevo lead
          </Link>
        }
      />

      <StageCounters counts={countByStage(leads)} href={(s) => `/leads?vista=tabla&etapa=${s}`} />

      <div className="my-5 inline-flex rounded-lg bg-slate-200/70 p-1" role="tablist" aria-label="Vista">
        <Link href="/leads" className={tabClass} aria-current={view === "kanban" ? "page" : undefined}>
          Kanban
        </Link>
        <Link href="/leads?vista=tabla" className={tabClass} aria-current={view === "tabla" ? "page" : undefined}>
          Tabla
        </Link>
      </div>

      {view === "kanban" ? (
        <KanbanBoard leads={leads} />
      ) : (
        <LeadsTable key={stage ?? "todas"} leads={leads} initialStage={stage} />
      )}
    </>
  );
}
