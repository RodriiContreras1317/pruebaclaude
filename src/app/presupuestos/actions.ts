"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guardarFuente, productosSchema, vehiculosSchema } from "@/lib/presupuestos/fuentes";
import type { Vehiculo } from "@/lib/presupuestos/lista";
import { leerCircular } from "@/lib/presupuestos/parse-circular";
import { abrirLibro, hojaSugerida, hojasDeLista, leerHoja } from "@/lib/presupuestos/parse-lista";
import type { Producto } from "@/lib/presupuestos/productos";

const MAX_BYTES = 20 * 1024 * 1024;

export type AnalisisCircular =
  | { ok: true; nombre: string; archivo: string; productos: Producto[] }
  | { ok: false; error: string };

export type AnalisisLista =
  | { ok: true; archivo: string; hojas: { nombre: string; vehiculos: Vehiculo[] }[]; sugerida: string }
  | { ok: false; error: string };

function archivoDe(formData: FormData, extension: string): File | string {
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) return "Elegí un archivo.";
  if (!archivo.name.toLowerCase().endsWith(extension)) return `El archivo tiene que ser ${extension}.`;
  if (archivo.size > MAX_BYTES) return "El archivo es demasiado grande (máximo 20 MB).";
  return archivo;
}

const mensaje = (e: unknown, porDefecto: string) => (e instanceof Error && e.message ? e.message : porDefecto);

export async function analizarCircular(formData: FormData): Promise<AnalisisCircular> {
  const archivo = archivoDe(formData, ".pdf");
  if (typeof archivo === "string") return { ok: false, error: archivo };
  try {
    const circular = await leerCircular(new Uint8Array(await archivo.arrayBuffer()));
    return { ok: true, nombre: circular.nombre, archivo: archivo.name, productos: circular.productos };
  } catch (e) {
    return { ok: false, error: mensaje(e, "No pude leer la circular.") };
  }
}

export async function analizarLista(formData: FormData): Promise<AnalisisLista> {
  const archivo = archivoDe(formData, ".xlsx");
  if (typeof archivo === "string") return { ok: false, error: archivo };
  try {
    const libro = await abrirLibro(await archivo.arrayBuffer());
    const nombres = hojasDeLista(libro);
    const hojas = nombres.flatMap((nombre) => {
      try {
        return [{ nombre, vehiculos: leerHoja(libro, nombre).vehiculos }];
      } catch {
        return [];
      }
    });
    const sugerida = hojaSugerida(hojas.map((h) => h.nombre));
    if (!sugerida) return { ok: false, error: "No encontré ninguna hoja con formato de lista de precios." };
    return { ok: true, archivo: archivo.name, hojas, sugerida };
  } catch (e) {
    return { ok: false, error: mensaje(e, "No pude leer el Excel.") };
  }
}

const guardarSchema = z.object({
  circular: z.object({ nombre: z.string().min(1), archivo: z.string(), productos: productosSchema }).optional(),
  lista: z.object({ nombre: z.string().min(1), archivo: z.string(), vehiculos: vehiculosSchema }).optional(),
});

export type NuevasFuentes = z.input<typeof guardarSchema>;

export async function guardarFuentes(input: NuevasFuentes): Promise<{ error?: string }> {
  const parsed = guardarSchema.safeParse(input);
  if (!parsed.success) return { error: "Los datos leídos no son válidos." };
  const { circular, lista } = parsed.data;
  if (circular) await guardarFuente("circular", circular.nombre, circular.archivo, circular.productos);
  if (lista) await guardarFuente("lista", lista.nombre, lista.archivo, lista.vehiculos);
  revalidatePath("/presupuestos");
  return {};
}
