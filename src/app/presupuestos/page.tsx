import type { Metadata } from "next";
import { Presupuesto } from "@/components/presupuesto";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Presupuestos · CRM de ventas" };

export default function PresupuestosPage() {
  return (
    <>
      <PageHeader title="Presupuestos" subtitle="Contado o financiado con los productos de la circular FCA vigente." />
      <Presupuesto />
    </>
  );
}
