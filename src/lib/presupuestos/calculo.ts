import type { Vehiculo } from "./lista";
import { MONTO_MINIMO, PRODUCTOS, aplicaAModelo, costoPrendario, type Producto } from "./productos";

export const NOTAS = {
  soloFyF: "Al retirar paga grabado de cristales.",
  puestoEnCalle: "Al retirar paga proporcional de patente y grabado de cristales. Oblea de circulación 0km.",
  financiado:
    "Al retirar paga proporcional de patente y grabado de cristales. Oblea de circulación 0km. Sellado en prenda registral 2%.",
} as const;

// ---------- Contado ----------

export type Contado = {
  precio: number;
  fleteFormularios: number;
  patentamiento: number;
  total: number;
  nota: string | null;
};

export function calcularContado(
  vehiculo: Vehiculo,
  precio: number,
  opciones: { fleteFormularios: boolean; patentamiento: boolean },
): Contado {
  const fleteFormularios = opciones.fleteFormularios ? vehiculo.fleteFormularios : 0;
  const patentamiento = opciones.patentamiento ? vehiculo.patentamiento : 0;
  const nota = opciones.patentamiento ? NOTAS.puestoEnCalle : opciones.fleteFormularios ? NOTAS.soloFyF : null;
  return { precio, fleteFormularios, patentamiento, total: precio + fleteFormularios + patentamiento, nota };
}

// ---------- Financiado ----------

export type CuotaPlazo = {
  meses: number;
  tna: number;
  prendaPct: number;
  montoFinanciado: number;
  /** Puesto en calle − monto financiado. */
  diferencia: number;
  prenda: number;
  /** Diferencia + prenda: lo que pone el cliente. */
  anticipo: number;
  cuota: number;
  /** El anticipo del cliente no alcanza: se financia el máximo y el anticipo sube. */
  anticipoInsuficiente: boolean;
  /** El saldo a financiar queda por debajo del mínimo de la financiera. */
  debajoDelMinimo: boolean;
};

export type OpcionFinanciacion = {
  producto: Producto;
  montoMaximo: number;
  plazos: CuotaPlazo[];
};

export type Financiado = {
  precio: number;
  fleteFormularios: number;
  patentamiento: number;
  puestoEnCalle: number;
  anticipoCliente: number;
  /** El anticipo cubre todo: no hace falta financiar. */
  sinSaldo: boolean;
  opciones: OpcionFinanciacion[];
  nota: string;
};

/** Monto máximo: el menor entre el tope, el LTV sobre el Precio Oficial y el puesto en calle. */
export function montoMaximo(producto: Producto, vehiculo: Vehiculo, puestoEnCalle: number): number {
  const porLtv = Math.floor(vehiculo.precioOficial * producto.ltv);
  return Math.min(producto.tope ?? Infinity, porLtv, puestoEnCalle);
}

/**
 * El anticipo que pone el cliente cubre la diferencia y la prenda:
 *   anticipo = (puesto en calle − monto) + monto × prenda%
 *   ⇒ monto = (puesto en calle − anticipo) / (1 − prenda%)
 * Si el monto supera el máximo del producto, se financia el máximo y se informa el anticipo necesario.
 */
export function calcularPlazo(
  puestoEnCalle: number,
  anticipoCliente: number,
  maximo: number,
  plazo: { meses: number; tna: number; aporteCE: number; coeficiente: number },
): CuotaPlazo {
  const prendaPct = costoPrendario(plazo.aporteCE);
  const necesario = Math.ceil((puestoEnCalle - anticipoCliente) / (1 - prendaPct));
  const montoFinanciado = Math.max(0, Math.min(necesario, maximo));
  const anticipoInsuficiente = necesario > maximo;
  const diferencia = puestoEnCalle - montoFinanciado;
  // Si el anticipo alcanza, la prenda es lo que sobra del anticipo (evita diferencias de $1 por redondeo).
  const prenda = anticipoInsuficiente
    ? Math.round(montoFinanciado * prendaPct)
    : Math.max(0, anticipoCliente - diferencia);
  return {
    meses: plazo.meses,
    tna: plazo.tna,
    prendaPct,
    montoFinanciado,
    diferencia,
    prenda,
    anticipo: diferencia + prenda,
    cuota: Math.round((montoFinanciado * plazo.coeficiente) / 1000),
    anticipoInsuficiente,
    debajoDelMinimo: montoFinanciado < MONTO_MINIMO,
  };
}

export function calcularFinanciado(vehiculo: Vehiculo, precio: number, anticipoCliente: number): Financiado {
  const puestoEnCalle = precio + vehiculo.fleteFormularios + vehiculo.patentamiento;
  const sinSaldo = anticipoCliente >= puestoEnCalle;
  const opciones = sinSaldo
    ? []
    : PRODUCTOS.filter((producto) => aplicaAModelo(producto, vehiculo.modelo)).map((producto) => {
        const maximo = montoMaximo(producto, vehiculo, puestoEnCalle);
        return {
          producto,
          montoMaximo: maximo,
          plazos: producto.plazos.map((plazo) => calcularPlazo(puestoEnCalle, anticipoCliente, maximo, plazo)),
        };
      });
  return {
    precio,
    fleteFormularios: vehiculo.fleteFormularios,
    patentamiento: vehiculo.patentamiento,
    puestoEnCalle,
    anticipoCliente,
    sinSaldo,
    opciones,
    nota: NOTAS.financiado,
  };
}

// ---------- Formato ----------

const pesos = new Intl.NumberFormat("es-AR", { style: "currency", currency: "ARS", maximumFractionDigits: 0 });
const porcentaje = new Intl.NumberFormat("es-AR", { style: "percent", minimumFractionDigits: 1, maximumFractionDigits: 2 });

export const formatPesos = (n: number) => pesos.format(n);
export const formatPct = (n: number) => porcentaje.format(n);

/** "$ 1.234.567" o "1234567" → 1234567. Ignora todo lo que no sea dígito. */
export function parsePesos(input: string): number {
  const digits = input.replace(/\D/g, "");
  return digits ? Number(digits) : 0;
}
