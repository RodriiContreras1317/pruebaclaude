import type { Metadata } from "next";
import { TournamentForm } from "@/components/truco/tournament-form";
import { Card, PageHeader } from "@/components/ui";

export const metadata: Metadata = { title: "Nuevo torneo de truco" };

export default function NuevoTorneoPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Nuevo torneo" subtitle="Cargá los equipos y se arma el fixture solo." />
      <Card>
        <TournamentForm />
      </Card>
    </div>
  );
}
