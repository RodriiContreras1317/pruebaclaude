import { LeadForm } from "@/components/lead-form";
import { Card, PageHeader } from "@/components/ui";

export default function NewLeadPage() {
  return (
    <div className="mx-auto max-w-xl">
      <PageHeader title="Nuevo lead" />
      <Card>
        <LeadForm />
      </Card>
    </div>
  );
}
