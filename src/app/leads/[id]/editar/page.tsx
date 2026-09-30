import { notFound } from "next/navigation";
import { LeadForm } from "@/components/lead-form";
import { Card, PageHeader } from "@/components/ui";
import { formatDate } from "@/lib/dates";
import { getLead } from "@/lib/leads";

export const dynamic = "force-dynamic";

export default async function EditLeadPage({ params }: PageProps<"/leads/[id]/editar">) {
  const { id } = await params;
  const lead = Number.isInteger(Number(id)) ? await getLead(Number(id)) : null;
  if (!lead) notFound();

  return (
    <div className="mx-auto max-w-xl">
      <PageHeader
        title="Editar lead"
        subtitle={
          <>
            Creado el {formatDate(lead.createdAt)}
            {lead.soldAt && ` · Vendido el ${formatDate(lead.soldAt)}`}
          </>
        }
      />
      <Card>
        <LeadForm lead={lead} />
      </Card>
    </div>
  );
}
