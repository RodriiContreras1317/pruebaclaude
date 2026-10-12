"use client";

import { useState, useTransition } from "react";
import { deleteTournament } from "@/app/truco/actions";
import { ConfirmDialog } from "../confirm-dialog";
import { TrashIcon } from "../icons";
import { buttonStyles } from "../ui";

export function DeleteTournamentButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button type="button" className={buttonStyles.secondary} onClick={() => setOpen(true)}>
        <TrashIcon className="size-4" />
        Eliminar
      </button>
      <ConfirmDialog
        open={open}
        title="¿Eliminar torneo?"
        confirmLabel="Eliminar"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() => startTransition(() => deleteTournament(id))}
      >
        Se va a eliminar <strong>{name}</strong> con todos sus partidos. Esta acción no se puede deshacer.
      </ConfirmDialog>
    </>
  );
}
