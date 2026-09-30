import Link from "next/link";
import type { LeadDTO } from "@/lib/leads";
import { DeleteLeadButton } from "./delete-lead-button";
import { PencilIcon } from "./icons";
import { buttonStyles } from "./ui";
import { WhatsAppButton } from "./whatsapp-button";

export function LeadActions({ lead }: { lead: LeadDTO }) {
  return (
    <div className="flex items-center gap-1">
      <WhatsAppButton phone={lead.phone} compact />
      <Link
        href={`/leads/${lead.id}/editar`}
        className={buttonStyles.icon}
        aria-label={`Editar a ${lead.fullName}`}
        title="Editar"
      >
        <PencilIcon className="size-4.5" />
      </Link>
      <DeleteLeadButton id={lead.id} name={lead.fullName} />
    </div>
  );
}
