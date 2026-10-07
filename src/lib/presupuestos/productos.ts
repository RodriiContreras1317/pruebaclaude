/**
 * Productos FCA 0 km — Circular Comercial N° 016.26, vigencia octubre 2026.
 * Es la definición base: al cargar una circular nueva se actualizan tasas, aportes,
 * coeficientes y topes (ver parse-circular.ts); LTV y modelos habilitados salen de acá.
 *
 * coeficiente: cuota cada $1.000 financiados, con IVA y sin seguro.
 * aporteCE: quebranto que cobra la financiera; el costo prendario es
 *   aporteCE × 1,21 (IVA) + 2% (sellado prenda registral).
 */

export type Plazo = { meses: number; tna: number; aporteCE: number; coeficiente: number };

export type Producto = {
  id: string;
  nombre: string;
  tipo: "promo" | "tradicional";
  uva: boolean;
  /** Monto máximo a financiar; null = sin tope fijo. */
  tope: number | null;
  /** Porcentaje máximo sobre el Precio Oficial. */
  ltv: number;
  /** Si está definido, el producto solo aplica a estos modelos. */
  modelos?: string[];
  aclaracion?: string;
  plazos: Plazo[];
};

export const CIRCULAR_BASE = "Circular 016.26 · Octubre 2026";

export const SELLADO_PRENDA = 0.02;
export const IVA = 0.21;
export const MONTO_MINIMO = 500_000;

export function costoPrendario(aporteCE: number): number {
  return Math.round((aporteCE * (1 + IVA) + SELLADO_PRENDA) * 10_000) / 10_000;
}

const p = (meses: number, tna: number, aporteCE: number, coeficiente: number): Plazo => ({ meses, tna, aporteCE, coeficiente });

/** Ordenados por prioridad: primero promos, después tradicionales. */
export const PRODUCTOS: Producto[] = [
  {
    id: "fija-18",
    nombre: "Tasa Fija $18M",
    tipo: "promo",
    uva: false,
    tope: 18_000_000,
    ltv: 0.8,
    plazos: [p(18, 0, 0.11, 56.22), p(24, 0.109, 0.11, 48.95), p(36, 0.209, 0.11, 41.58)],
  },
  {
    id: "fija-24",
    nombre: "Tasa Fija $24M",
    tipo: "promo",
    uva: false,
    tope: 24_000_000,
    ltv: 0.8,
    plazos: [p(12, 0, 0.11, 84.33), p(18, 0.089, 0.11, 61.76), p(24, 0.179, 0.11, 53.48), p(36, 0.259, 0.11, 45.05)],
  },
  {
    id: "fija-28",
    nombre: "Tasa Fija $28M",
    tipo: "promo",
    uva: false,
    tope: 28_000_000,
    ltv: 0.8,
    modelos: ["CRONOS", "PULSE", "FASTBACK", "TORO"],
    aclaracion: "Solo Cronos, Pulse, Fastback y Toro",
    plazos: [p(12, 0, 0.12, 84.33), p(18, 0, 0.12, 56.22), p(24, 0.059, 0.12, 45.8), p(36, 0.189, 0.12, 40.21)],
  },
  {
    id: "uva-30",
    nombre: "Promo UVA $30M",
    tipo: "promo",
    uva: true,
    tope: 30_000_000,
    ltv: 0.8,
    aclaracion: "Máximo: el menor entre $30M y el 80% del Precio Oficial",
    plazos: [
      p(12, 0, 0.06, 84.33),
      p(18, 0, 0.1, 56.22),
      p(24, 0, 0.1, 42.17),
      p(36, 0, 0.12, 28.11),
      p(48, 0.059, 0.12, 24.71),
      p(60, 0.099, 0.12, 23.11),
    ],
  },
  {
    id: "titano-35",
    nombre: "Titano $35M",
    tipo: "promo",
    uva: false,
    tope: 35_000_000,
    ltv: 0.8,
    modelos: ["TITANO"],
    aclaracion: "Solo Titano",
    plazos: [
      p(12, 0, 0.1, 84.33),
      p(18, 0.139, 0.1, 64.95),
      p(24, 0.219, 0.1, 56.13),
      p(36, 0.289, 0.1, 47.18),
      p(48, 0.319, 0.1, 42.88),
      p(60, 0.349, 0.1, 41.64),
    ],
  },
  {
    id: "trad",
    nombre: "Línea Tradicional",
    tipo: "tradicional",
    uva: false,
    tope: null,
    ltv: 0.8,
    plazos: [
      p(12, 0.459, 0, 114.43),
      p(18, 0.459, 0, 86.49),
      p(24, 0.459, 0, 72.86),
      p(36, 0.459, 0, 59.87),
      p(48, 0.459, 0, 53.96),
      p(60, 0.459, 0, 50.84),
    ],
  },
  {
    id: "trad-10",
    nombre: "Línea Tradicional 10%",
    tipo: "tradicional",
    uva: false,
    tope: null,
    ltv: 0.8,
    plazos: [
      p(12, 0.219, 0.1, 98.35),
      p(18, 0.289, 0.1, 74.8),
      p(24, 0.319, 0.1, 62.92),
      p(36, 0.359, 0.1, 52.28),
      p(48, 0.379, 0.1, 47.53),
      p(60, 0.399, 0.1, 45.75),
    ],
  },
  {
    id: "trad-15",
    nombre: "Línea Tradicional 15%",
    tipo: "tradicional",
    uva: false,
    tope: null,
    ltv: 0.8,
    plazos: [
      p(12, 0.119, 0.15, 91.87),
      p(18, 0.209, 0.15, 69.49),
      p(24, 0.259, 0.15, 58.81),
      p(36, 0.319, 0.15, 49.35),
      p(48, 0.349, 0.15, 45.18),
      p(60, 0.359, 0.15, 42.45),
    ],
  },
  {
    id: "uva-trad",
    nombre: "UVA Tradicional 23,9%",
    tipo: "tradicional",
    uva: true,
    tope: null,
    ltv: 0.7,
    plazos: [
      p(12, 0.239, 0, 99.66),
      p(24, 0.239, 0, 57.46),
      p(36, 0.239, 0, 43.65),
      p(48, 0.239, 0, 36.93),
      p(60, 0.239, 0, 33.04),
    ],
  },
  {
    id: "uva-trad-10",
    nombre: "UVA Tradicional 10%",
    tipo: "tradicional",
    uva: true,
    tope: null,
    ltv: 0.7,
    plazos: [
      p(12, 0.049, 0.1, 87.41),
      p(24, 0.129, 0.1, 50.23),
      p(36, 0.159, 0.1, 38.2),
      p(48, 0.179, 0.1, 32.67),
      p(60, 0.179, 0.1, 28.64),
    ],
  },
  {
    id: "uva-trad-15",
    nombre: "UVA Tradicional 15%",
    tipo: "tradicional",
    uva: true,
    tope: null,
    ltv: 0.7,
    plazos: [
      p(12, 0, 0.13, 84.33),
      p(24, 0.069, 0.15, 46.43),
      p(36, 0.129, 0.15, 36.22),
      p(48, 0.159, 0.15, 31.29),
      p(60, 0.169, 0.15, 27.92),
    ],
  },
];

export function aplicaAModelo(producto: Producto, modelo: string): boolean {
  if (!producto.modelos) return true;
  const nombre = modelo.toUpperCase();
  return producto.modelos.some((m) => nombre.startsWith(m));
}
