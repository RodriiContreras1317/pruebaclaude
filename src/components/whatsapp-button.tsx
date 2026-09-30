import { formatArPhone, whatsappUrl } from "@/lib/phone";
import { WhatsAppIcon } from "./icons";

export function WhatsAppButton({ phone, compact = false }: { phone: string; compact?: boolean }) {
  return (
    <a
      href={whatsappUrl(phone)}
      target="_blank"
      rel="noopener noreferrer"
      title={`Abrir WhatsApp con ${formatArPhone(phone)}`}
      aria-label="Abrir WhatsApp"
      className={`inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500 font-medium text-white hover:bg-emerald-600 ${
        compact ? "size-9" : "px-3 py-2 text-sm"
      }`}
    >
      <WhatsAppIcon className="size-4.5" />
      {!compact && "WhatsApp"}
    </a>
  );
}
