"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { normalizeArPhone } from "@/lib/phone";
import { isStage, nextSoldAt, STAGES, type Stage } from "@/lib/stages";

export interface LeadFormState {
  errors?: Partial<Record<"fullName" | "phone" | "stage" | "notes", string[]>>;
  message?: string;
}

const leadSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "El nombre es obligatorio.")
    .max(120, "El nombre es demasiado largo."),
  phone: z
    .string()
    .trim()
    .min(1, "El teléfono es obligatorio.")
    .transform((value, ctx) => {
      const normalized = normalizeArPhone(value);
      if (!normalized) {
        ctx.addIssue({
          code: "custom",
          message: "Teléfono inválido. Usá un número argentino, por ejemplo 11 2345-6789 o +54 9 11 2345-6789.",
        });
        return z.NEVER;
      }
      return normalized;
    }),
  stage: z.enum(STAGES, { message: "Elegí una etapa." }),
  notes: z
    .string()
    .trim()
    .max(2000, "Las notas no pueden superar los 2000 caracteres.")
    .transform((v) => (v === "" ? null : v)),
});

function revalidateAll() {
  revalidatePath("/");
  revalidatePath("/leads");
  revalidatePath("/objetivos");
}

export async function saveLead(_prev: LeadFormState, formData: FormData): Promise<LeadFormState> {
  const parsed = leadSchema.safeParse({
    fullName: formData.get("fullName") ?? "",
    phone: formData.get("phone") ?? "",
    stage: formData.get("stage") ?? "",
    notes: formData.get("notes") ?? "",
  });

  if (!parsed.success) {
    return { errors: z.flattenError(parsed.error).fieldErrors };
  }

  const id = Number(formData.get("id")) || null;
  const data = parsed.data;

  if (id) {
    const existing = await prisma.lead.findUnique({ where: { id } });
    if (!existing) return { message: "El lead ya no existe." };
    await prisma.lead.update({
      where: { id },
      data: { ...data, soldAt: nextSoldAt(existing, data.stage) },
    });
  } else {
    await prisma.lead.create({
      data: { ...data, soldAt: nextSoldAt(null, data.stage) },
    });
  }

  revalidateAll();
  redirect("/leads");
}

export async function updateLeadStage(id: number, stage: Stage): Promise<{ ok: boolean }> {
  if (!Number.isInteger(id) || !isStage(stage)) return { ok: false };

  const existing = await prisma.lead.findUnique({ where: { id } });
  if (!existing) return { ok: false };
  if (existing.stage !== stage) {
    await prisma.lead.update({
      where: { id },
      data: { stage, soldAt: nextSoldAt(existing, stage) },
    });
  }

  revalidateAll();
  return { ok: true };
}

export async function deleteLead(id: number): Promise<{ ok: boolean }> {
  if (!Number.isInteger(id)) return { ok: false };
  await prisma.lead.deleteMany({ where: { id } });
  revalidateAll();
  return { ok: true };
}
