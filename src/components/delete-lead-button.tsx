"use client";

import { useState, useTransition } from "react";
import { deleteLead } from "@/app/leads/actions";
import { ConfirmDialog } from "./confirm-dialog";
import { TrashIcon } from "./icons";
import { buttonStyles } from "./ui";

export function DeleteLeadButton({ id, name }: { id: number; name: string }) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        className={`${buttonStyles.icon} hover:bg-rose-50 hover:text-rose-600`}
        onClick={() => setOpen(true)}
          aria-label={`Eliminar a ${name}`}
        title="Eliminar"
      >
        <TrashIcon className="size-4.5" />
      </button>
      <ConfirmDialog
        open={open}
        title="¿Eliminar lead?"
        confirmLabel="Eliminar"
        pending={pending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          startTransition(async () => {
            await deleteLead(id);
            setOpen(false);
          })
        }
      >
        Se va a eliminar a <strong>{name}</strong>. Esta acción no se puede deshacer.
      </ConfirmDialog>
    </>
  );
}
