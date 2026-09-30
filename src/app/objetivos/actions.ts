"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db";

export interface GoalFormState {
  error?: string;
  saved?: boolean;
}

const goalSchema = z.object({
  year: z.coerce.number().int().min(2000).max(2100),
  month: z.coerce.number().int().min(1).max(12),
  target: z.coerce
    .number({ message: "Ingresá un número." })
    .int("El objetivo tiene que ser un número entero.")
    .min(1, "El objetivo tiene que ser al menos 1.")
    .max(10000, "El objetivo es demasiado grande."),
});

export async function saveMonthlyGoal(_prev: GoalFormState, formData: FormData): Promise<GoalFormState> {
  const parsed = goalSchema.safeParse({
    year: formData.get("year"),
    month: formData.get("month"),
    target: formData.get("target"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  const { year, month, target } = parsed.data;
  await prisma.monthlyGoal.upsert({
    where: { year_month: { year, month } },
    create: { year, month, target },
    update: { target },
  });

  revalidatePath("/");
  revalidatePath("/objetivos");
  return { saved: true };
}
