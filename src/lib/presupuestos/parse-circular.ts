import { getDocumentProxy } from "unpdf";
import { PRODUCTOS, type Plazo, type Producto } from "./productos";

/**
 * Lee la Circular Comercial FCA (PDF) y actualiza tasas, aportes, coeficientes y topes
 * de los productos conocidos.
 *
 * La circular tiene una tabla por sección ("PROMOCIONES 0 Km", "FINANCIACIÓN 0 Km") con un
 * bloque por producto. Cada fila es: plazo · TNA · aporte CE · cuota cada $1.000. Un bloque
 * nuevo empieza cuando el plazo vuelve a bajar. Los bloques se asignan a los productos por
 * orden de aparición, igual que en la circular N° 016.26. LTV y modelos habilitados se
 * mantienen de la definición base.
 */

export type Circular = {
  nombre: string;
  productos: Producto[];
};

/** Orden de los bloques en cada sección. null = bloque que existe pero no se usa. */
const ORDEN_SECCIONES: Record<"promo" | "financiacion", (string | null)[]> = {
  promo: ["fija-18", "fija-24", "fija-28", "uva-30", "titano-35"],
  financiacion: ["trad", "trad-10", "trad-15", "uva-trad", "uva-trad-10", "uva-trad-15"],
};

type Bloque = { plazos: Plazo[]; tope: number | null };

const FILA = /(?:^|\s)(\d{1,2})\s+(\d{1,2},\d)\s*%\s+(\d{1,2},\d)\s*%\s+\$\s*(\d{1,3},\d{2})/;
const MONTO = /\$\s*(\d{1,3}(?:\.\d{3}){2,})/;

const numero = (s: string) => Number(s.replace(/\./g, "").replace(",", "."));
const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

/** Texto del PDF agrupado en líneas (de arriba hacia abajo, de izquierda a derecha). */
export async function lineasDelPdf(data: Uint8Array): Promise<string[]> {
  const pdf = await getDocumentProxy(data);
  const lineas: string[] = [];
  for (let n = 1; n <= pdf.numPages; n++) {
    const page = await pdf.getPage(n);
    const { items } = await page.getTextContent();
    const porY = new Map<number, { x: number; s: string }[]>();
    for (const item of items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      const key = [...porY.keys()].find((k) => Math.abs(k - y) <= 2) ?? y;
      if (!porY.has(key)) porY.set(key, []);
      porY.get(key)!.push({ x: item.transform[4], s: item.str.trim() });
    }
    for (const [, partes] of [...porY].sort((a, b) => b[0] - a[0])) {
      lineas.push(partes.sort((a, b) => a.x - b.x).map((p) => p.s).join(" "));
    }
  }
  return lineas;
}

function bloquesPorSeccion(lineas: string[]) {
  const secciones: Record<"promo" | "financiacion", Bloque[]> = { promo: [], financiacion: [] };
  let seccion: "promo" | "financiacion" | null = null;
  let actual: Bloque | null = null;
  let topePendiente: number | null = null;

  for (const linea of lineas) {
    const norm = normalizar(linea);
    if (norm.startsWith("PROMOCIONES 0 KM")) {
      seccion = "promo";
      actual = null;
      continue;
    }
    if (norm.startsWith("FINANCIACION 0 KM")) {
      seccion = "financiacion";
      actual = null;
      continue;
    }
    if (norm.startsWith("VENTAS ESPECIALES") || norm.startsWith("PRENDARIO PARA CANCELACION")) {
      seccion = null;
      continue;
    }
    if (!seccion) continue;

    const fila = FILA.exec(linea);
    const monto = MONTO.exec(linea);
    if (fila) {
      const plazo: Plazo = {
        meses: Number(fila[1]),
        tna: Math.round(numero(fila[2]) * 10) / 1000,
        aporteCE: Math.round(numero(fila[3]) * 10) / 1000,
        coeficiente: numero(fila[4]),
      };
      const ultimo = actual?.plazos.at(-1);
      if (!actual || !ultimo || plazo.meses <= ultimo.meses) {
        actual = { plazos: [], tope: topePendiente };
        topePendiente = null;
        secciones[seccion].push(actual);
      }
      actual.plazos.push(plazo);
    }
    if (monto) {
      // El tope suele estar centrado en el bloque; si aparece antes de la primera fila, queda pendiente.
      if (actual && actual.tope === null) actual.tope = numero(monto[1]);
      else topePendiente = numero(monto[1]);
    }
  }
  return secciones;
}

export function parsearCircular(lineas: string[]): Circular {
  const texto = lineas.map(normalizar);
  const nro = texto.map((l) => /CIRCULAR COMERCIAL NRO\.?\s*([\d.]+)/.exec(l)?.[1]).find(Boolean);
  const vigencia = texto.map((l) => /VIGENCIA:\s*([A-Z]+)\s*\/\s*(\d{4})/.exec(l)).find(Boolean);
  if (!nro) throw new Error("No parece una Circular Comercial FCA (no encontré el número de circular).");

  const secciones = bloquesPorSeccion(lineas);
  const productos: Producto[] = [];

  for (const seccion of ["promo", "financiacion"] as const) {
    const orden = ORDEN_SECCIONES[seccion];
    const bloques = secciones[seccion];
    if (bloques.length < orden.length) {
      throw new Error(
        `En la sección ${seccion === "promo" ? "Promociones" : "Financiación"} encontré ${bloques.length} productos y esperaba al menos ${orden.length}.`,
      );
    }
    orden.forEach((id, i) => {
      if (!id) return;
      const base = PRODUCTOS.find((p) => p.id === id)!;
      const bloque = bloques[i];
      if (base.tope !== null && bloque.tope === null) {
        throw new Error(`No encontré el máximo a financiar de ${base.nombre}.`);
      }
      const tope = base.tope === null ? null : bloque.tope;
      const nombre = base.tope === null ? base.nombre : base.nombre.replace(/\$\d+M/, `$${(tope! / 1_000_000).toLocaleString("es-AR")}M`);
      productos.push({ ...base, nombre, tope, plazos: bloque.plazos });
    });
  }

  const nombre = `Circular ${nro}${vigencia ? ` · ${vigencia[1][0]}${vigencia[1].slice(1).toLowerCase()} ${vigencia[2]}` : ""}`;
  return { nombre, productos };
}

export async function leerCircular(data: Uint8Array): Promise<Circular> {
  return parsearCircular(await lineasDelPdf(data));
}
