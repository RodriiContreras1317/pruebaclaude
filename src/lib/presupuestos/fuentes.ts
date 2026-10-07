import { z } from "zod";
import { prisma } from "@/lib/db";
import { LISTA_BASE, VEHICULOS, type Vehiculo } from "./lista";
import { CIRCULAR_BASE, PRODUCTOS, type Producto } from "./productos";

/** Circular o lista en uso. cargadaEn null = la que viene incluida en la app. */
export type Fuente<T> = { nombre: string; archivo: string | null; cargadaEn: string | null; datos: T };
export type Fuentes = { circular: Fuente<Producto[]>; lista: Fuente<Vehiculo[]> };

const plazoSchema = z.object({
  meses: z.number().int().positive(),
  tna: z.number().min(0).max(5),
  aporteCE: z.number().min(0).max(1),
  coeficiente: z.number().positive(),
});

export const productosSchema = z
  .array(
    z.object({
      id: z.string(),
      nombre: z.string(),
      tipo: z.enum(["promo", "tradicional"]),
      uva: z.boolean(),
      tope: z.number().positive().nullable(),
      ltv: z.number().positive().max(1),
      modelos: z.array(z.string()).optional(),
      aclaracion: z.string().optional(),
      plazos: z.array(plazoSchema).min(1),
    }),
  )
  .min(1);

export const vehiculosSchema = z
  .array(
    z.object({
      codigo: z.string(),
      modelo: z.string().min(1),
      precioOficial: z.number().positive(),
      precioTaraborelli: z.number().positive(),
      fleteFormularios: z.number().min(0),
      patentamiento: z.number().min(0),
    }),
  )
  .min(1);

async function ultima<T>(tipo: "circular" | "lista", schema: z.ZodType<T>, base: Fuente<T>): Promise<Fuente<T>> {
  const fila = await prisma.fuentePresupuesto.findFirst({ where: { tipo }, orderBy: { id: "desc" } });
  if (!fila) return base;
  const datos = schema.safeParse(JSON.parse(fila.datos));
  if (!datos.success) return base;
  return { nombre: fila.nombre, archivo: fila.archivo, cargadaEn: fila.createdAt.toISOString(), datos: datos.data };
}

/** Las últimas cargadas; si nunca se cargó ninguna, las incluidas en la app. */
export async function getFuentesVigentes(): Promise<Fuentes> {
  const [circular, lista] = await Promise.all([
    ultima("circular", productosSchema, { nombre: CIRCULAR_BASE, archivo: null, cargadaEn: null, datos: PRODUCTOS }),
    ultima("lista", vehiculosSchema, { nombre: LISTA_BASE, archivo: null, cargadaEn: null, datos: VEHICULOS }),
  ]);
  return { circular, lista };
}

export async function guardarFuente(tipo: "circular" | "lista", nombre: string, archivo: string, datos: unknown) {
  await prisma.fuentePresupuesto.create({ data: { tipo, nombre, archivo, datos: JSON.stringify(datos) } });
}
