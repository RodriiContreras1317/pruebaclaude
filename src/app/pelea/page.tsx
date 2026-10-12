import type { Metadata } from "next";
import { FightGame } from "@/components/fight-game";
import { PageHeader } from "@/components/ui";

export const metadata: Metadata = {
  title: "Combate Final · Pelea 2D",
  description: "Juego de pelea 2D estilo arcade: contra la computadora o de a dos en el mismo teclado.",
};

export default function PeleaPage() {
  return (
    <>
      <PageHeader title="Combate Final" subtitle="Pelea 2D estilo arcade: contra la compu o de a dos en el mismo teclado." />
      <FightGame />
    </>
  );
}
