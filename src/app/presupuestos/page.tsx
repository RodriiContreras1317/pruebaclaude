import type { Metadata } from "next";
import { Presupuesto } from "@/components/presupuesto";
import { PageHeader } from "@/components/ui";
import { getFuentesVigentes } from "@/lib/presupuestos/fuentes";

export const metadata: Metadata = { title: "Presupuestos · CRM de ventas" };

export const dynamic = "force-dynamic";

export default async function PresupuestosPage() {
  const fuentes = await getFuentesVigentes();
  return (
    <>
      <PageHeader title="Presupuestos" subtitle="Contado o financiado con los productos de la circular FCA vigente." />
      <Presupuesto fuentes={fuentes} />
    </>
  );
}
