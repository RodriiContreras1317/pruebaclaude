import ExcelJS from "exceljs";
import type { Vehiculo } from "./lista";

/**
 * Lee la lista de precios Fiat (Excel). Cada hoja es una versión de la lista; se busca la fila
 * de encabezados (la que tiene "MODELO-VERSION") y las columnas por nombre:
 * Código, Modelo, Precio Oficial, Precio TARABORELLI, Flete/Form. y Patentamiento.
 * Se leen las filas hasta "Versiones discontinuadas".
 */

export type Lista = { nombre: string; vehiculos: Vehiculo[] };

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/\s+/g, " ")
    .trim();

function valor(cell: ExcelJS.Cell): unknown {
  const v = cell.value;
  if (v && typeof v === "object") {
    if ("result" in v) return v.result;
    if ("richText" in v) return v.richText.map((t) => t.text).join("");
    if ("text" in v) return v.text;
  }
  return v;
}

const texto = (cell: ExcelJS.Cell) => {
  const v = valor(cell);
  return typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "";
};

const numero = (cell: ExcelJS.Cell) => {
  const v = valor(cell);
  return typeof v === "number" && Number.isFinite(v) ? Math.round(v) : null;
};

const COLUMNAS = {
  codigo: (h: string) => h.startsWith("CODIGO"),
  modelo: (h: string) => h.startsWith("MODELO"),
  precioOficial: (h: string) => h === "PRECIO OFICIAL",
  precioTaraborelli: (h: string) => h.startsWith("PRECIO TARABORELLI"),
  fleteFormularios: (h: string) => h.startsWith("FLETE"),
  patentamiento: (h: string) => h.startsWith("PATENTAMIENTO"),
};

export async function abrirLibro(data: ArrayBuffer): Promise<ExcelJS.Workbook> {
  const libro = new ExcelJS.Workbook();
  await libro.xlsx.load(data);
  return libro;
}

/** Hojas que tienen el formato de lista de precios, en el orden del libro. */
export function hojasDeLista(libro: ExcelJS.Workbook): string[] {
  return libro.worksheets.filter((h) => encontrarEncabezados(h) !== null).map((h) => h.name);
}

/** Sugerencia: la primera hoja cuyo nombre dice "VIGENTE", o la primera con formato de lista. */
export function hojaSugerida(hojas: string[]): string | undefined {
  return hojas.find((h) => normalizar(h).includes("VIGENTE")) ?? hojas[0];
}

function encontrarEncabezados(hoja: ExcelJS.Worksheet) {
  for (let r = 1; r <= Math.min(10, hoja.rowCount); r++) {
    const fila = hoja.getRow(r);
    const columnas: Partial<Record<keyof typeof COLUMNAS, number>> = {};
    fila.eachCell((cell, col) => {
      const h = normalizar(texto(cell));
      for (const [clave, coincide] of Object.entries(COLUMNAS) as [keyof typeof COLUMNAS, (h: string) => boolean][]) {
        if (columnas[clave] === undefined && coincide(h)) columnas[clave] = col;
      }
    });
    if (Object.keys(COLUMNAS).every((k) => columnas[k as keyof typeof COLUMNAS] !== undefined)) {
      return { fila: r, columnas: columnas as Record<keyof typeof COLUMNAS, number> };
    }
  }
  return null;
}

export function leerHoja(libro: ExcelJS.Workbook, nombreHoja: string): Lista {
  const hoja = libro.getWorksheet(nombreHoja);
  if (!hoja) throw new Error(`No existe la hoja "${nombreHoja}".`);
  const encabezados = encontrarEncabezados(hoja);
  if (!encabezados) throw new Error(`La hoja "${nombreHoja}" no tiene el formato de lista de precios.`);
  const { fila: filaEncabezados, columnas: c } = encabezados;

  const vehiculos: Vehiculo[] = [];
  for (let r = filaEncabezados + 1; r <= hoja.rowCount; r++) {
    const fila = hoja.getRow(r);
    const modelo = texto(fila.getCell(c.modelo));
    if (normalizar(modelo).includes("VERSIONES DISCONTINUADAS")) break;
    const precioOficial = numero(fila.getCell(c.precioOficial));
    const precioTaraborelli = numero(fila.getCell(c.precioTaraborelli));
    const fleteFormularios = numero(fila.getCell(c.fleteFormularios));
    const patentamiento = numero(fila.getCell(c.patentamiento));
    if (!modelo || !precioOficial || !precioTaraborelli || fleteFormularios === null || patentamiento === null) continue;
    vehiculos.push({
      codigo: texto(fila.getCell(c.codigo)),
      modelo,
      precioOficial,
      precioTaraborelli,
      fleteFormularios,
      patentamiento,
    });
  }
  if (vehiculos.length === 0) throw new Error(`No encontré modelos con precio en la hoja "${nombreHoja}".`);
  return { nombre: nombreHoja.trim(), vehiculos };
}
