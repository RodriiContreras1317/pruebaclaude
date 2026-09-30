import { PrismaClient } from "@prisma/client";
import { todayISO } from "../src/lib/dates";
import { normalizeArPhone } from "../src/lib/phone";
import { addDays, DEFAULT_MONTHLY_GOAL, type ISODate } from "../src/lib/planning";
import type { Stage } from "../src/lib/stages";

const prisma = new PrismaClient();

/** Mediodía en Argentina de una fecha civil. */
const at = (date: ISODate) => new Date(`${date}T12:00:00-03:00`);

const today = todayISO();
const monthFirst = `${today.slice(0, 8)}01`;

/** Fecha de venta dentro del mes actual (sin pasar de hoy); si no entra, cae en el mes anterior. */
function saleDate(offsetFromMonthStart: number): ISODate {
  const d = addDays(monthFirst, offsetFromMonthStart);
  return d <= today ? d : addDays(d, -31);
}

interface SeedLead {
  fullName: string;
  phone: string;
  stage: Stage;
  notes?: string;
  createdDaysAgo: number;
  updatedDaysAgo: number;
  soldOn?: ISODate;
}

const leads: SeedLead[] = [
  // No vendido
  { fullName: "Martín Gómez", phone: "11 5555-0101", stage: "NO_VENDIDO", notes: "No le interesó por ahora. Volver a intentar en unos meses.", createdDaysAgo: 40, updatedDaysAgo: 20 },
  { fullName: "Lucía Fernández", phone: "+54 9 11 5555-0102", stage: "NO_VENDIDO", createdDaysAgo: 25, updatedDaysAgo: 18 },
  { fullName: "Diego Romero", phone: "0351 15 555-0103", stage: "NO_VENDIDO", notes: "Eligió a la competencia por precio.", createdDaysAgo: 15, updatedDaysAgo: 10 },

  // Seguimiento
  { fullName: "Sofía Martínez", phone: "011 15 5555-0104", stage: "SEGUIMIENTO", notes: "Pidió que la llame la semana que viene.", createdDaysAgo: 12, updatedDaysAgo: 6 },
  { fullName: "Juan Pablo Díaz", phone: "+54 341 555-0105", stage: "SEGUIMIENTO", notes: "Le mandé la lista de precios por WhatsApp.", createdDaysAgo: 9, updatedDaysAgo: 3 },
  { fullName: "Valentina López", phone: "11 5555 0106", stage: "SEGUIMIENTO", createdDaysAgo: 5, updatedDaysAgo: 1 },

  // Posible compra
  { fullName: "Tomás Acosta", phone: "+5491155550107", stage: "POSIBLE_COMPRA", notes: "Muy interesado. Espera aprobación del socio.", createdDaysAgo: 14, updatedDaysAgo: 4 },
  { fullName: "Camila Herrera", phone: "0261 15 555-0108", stage: "POSIBLE_COMPRA", notes: "Quiere cerrar antes de fin de mes. Pidió factura A.", createdDaysAgo: 8, updatedDaysAgo: 2 },
  { fullName: "Federico Sosa", phone: "221 555-0109", stage: "POSIBLE_COMPRA", notes: "Consultó por financiación en cuotas.", createdDaysAgo: 6, updatedDaysAgo: 0 },

  // Vendido
  { fullName: "Agustina Ruiz", phone: "11 5555-0110", stage: "VENDIDO", notes: "Pagó por transferencia.", createdDaysAgo: 45, updatedDaysAgo: 35, soldOn: addDays(monthFirst, -12) },
  { fullName: "Nicolás Álvarez", phone: "+54 9 11 5555-0111", stage: "VENDIDO", createdDaysAgo: 20, updatedDaysAgo: 0, soldOn: saleDate(1) },
  { fullName: "Florencia Benítez", phone: "0341 15 555-0112", stage: "VENDIDO", notes: "Recomendada por Agustina.", createdDaysAgo: 18, updatedDaysAgo: 0, soldOn: saleDate(3) },
  { fullName: "Matías Torres", phone: "11 15 5555-0113", stage: "VENDIDO", createdDaysAgo: 16, updatedDaysAgo: 0, soldOn: saleDate(8) },
  { fullName: "Carolina Medina", phone: "0223 555-0114", stage: "VENDIDO", notes: "Quiere sumar otro producto el mes que viene.", createdDaysAgo: 22, updatedDaysAgo: 0, soldOn: saleDate(9) },
  { fullName: "Santiago Castro", phone: "+54 9 381 555-0115", stage: "VENDIDO", createdDaysAgo: 11, updatedDaysAgo: 0, soldOn: saleDate(15) },
];

async function main() {
  await prisma.lead.deleteMany();

  for (const lead of leads) {
    const phone = normalizeArPhone(lead.phone);
    if (!phone) throw new Error(`Teléfono inválido en el seed: ${lead.phone}`);

    const createdAt = at(addDays(today, -lead.createdDaysAgo));
    const soldAt = lead.soldOn ? at(lead.soldOn) : null;
    const updatedAt = soldAt ?? at(addDays(today, -lead.updatedDaysAgo));

    await prisma.lead.create({
      data: {
        fullName: lead.fullName,
        phone,
        stage: lead.stage,
        notes: lead.notes ?? null,
        createdAt: createdAt < updatedAt ? createdAt : updatedAt,
        updatedAt,
        soldAt,
      },
    });
  }

  const [year, month] = today.split("-").map(Number);
  await prisma.monthlyGoal.upsert({
    where: { year_month: { year, month } },
    create: { year, month, target: DEFAULT_MONTHLY_GOAL },
    update: {},
  });

  console.log(`Seed listo: ${leads.length} leads y objetivo de ${DEFAULT_MONTHLY_GOAL} ventas para ${month}/${year}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
