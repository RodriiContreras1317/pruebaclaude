/**
 * Teléfonos de Argentina.
 *
 * Se aceptan, entre otros:
 *   +54 9 11 2345-6789 · 54 9 11 23456789 · +54 11 2345-6789
 *   011 2345-6789 · 11 15 2345-6789 · 0351 15 123-4567 · 1123456789
 *
 * Todos se normalizan a +549 + número nacional de 10 dígitos
 * (código de área sin 0 + número sin 15), que es el formato que usa WhatsApp.
 */

const NATIONAL = /^[1-3]\d{9}$/;

/** Devuelve el número nacional de 10 dígitos o null si no es válido. */
export function toNationalNumber(input: string): string | null {
  const trimmed = input.trim();
  if (!/^\+?[\d\s\-().]+$/.test(trimmed)) return null;

  let digits = trimmed.replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);

  const international = trimmed.startsWith("+") || (digits.startsWith("54") && digits.length > 10);
  if (international) {
    if (!digits.startsWith("54")) return null;
    digits = digits.slice(2);
    if (digits.startsWith("9")) digits = digits.slice(1);
  }

  if (digits.startsWith("0")) digits = digits.slice(1);

  // Prefijo de celular "15" después del código de área (2, 3 o 4 dígitos).
  if (digits.length === 12) {
    const areaLengths = digits.startsWith("11") ? [2] : [3, 4];
    const area = areaLengths.find((n) => digits.slice(n, n + 2) === "15");
    if (area === undefined) return null;
    digits = digits.slice(0, area) + digits.slice(area + 2);
  }

  return NATIONAL.test(digits) ? digits : null;
}

/** Normaliza a +549XXXXXXXXXX o devuelve null si no es válido. */
export function normalizeArPhone(input: string): string | null {
  const national = toNationalNumber(input);
  return national ? `+549${national}` : null;
}

/** Formato legible: +54 9 11 2345-6789 / +54 9 351 123-4567. */
export function formatArPhone(phone: string): string {
  const national = phone.replace(/^\+549/, "");
  if (!NATIONAL.test(national)) return phone;
  const areaLength = national.startsWith("11") ? 2 : 3;
  const area = national.slice(0, areaLength);
  const local = national.slice(areaLength);
  const cut = local.length - 4;
  return `+54 9 ${area} ${local.slice(0, cut)}-${local.slice(cut)}`;
}

export function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, "")}`;
}
