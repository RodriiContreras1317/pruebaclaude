/**
 * Lista de precios Fiat vigente: Circular Comercial 72/2026 – Octubre (N° 10/2026), vigencia 05/10/2026.
 * Fuente: hoja " Fiat Oct 26 Vig.05.10" del Excel de listas.
 *
 * - precioOficial: lista FCA (base del LTV).
 * - precioTaraborelli: referencia para el vendedor; el precio de la operación se carga a mano.
 * - fleteFormularios: Flete, Form. 01 y gastos varios (4% del oficial).
 * - patentamiento: 6% del oficial (incluye sellado 3%).
 */

export type Vehiculo = {
  codigo: string;
  modelo: string;
  precioOficial: number;
  precioTaraborelli: number;
  fleteFormularios: number;
  patentamiento: number;
};

export const LISTA_VIGENTE = "Lista Fiat Octubre 2026 · vigencia 05/10/2026";

export const VEHICULOS: Vehiculo[] = [
  { codigo: "00-341-AB1-0", modelo: "MOBI TREKKING 1.0", precioOficial: 30280000, precioTaraborelli: 28375388, fleteFormularios: 1211200, patentamiento: 1816800 },
  { codigo: "00-341-ABB-0", modelo: "MOBI TREKKING 1.0 MT", precioOficial: 30280000, precioTaraborelli: 28375388, fleteFormularios: 1211200, patentamiento: 1816800 },
  { codigo: "00-358-AF2-1", modelo: "ARGO DRIVE 1.3L MT MY26", precioOficial: 35470000, precioTaraborelli: 27450233, fleteFormularios: 1418800, patentamiento: 2128200 },
  { codigo: "00-358-AFK-1", modelo: "ARGO DRIVE 1.3 CVT MY26", precioOficial: 37730000, precioTaraborelli: 30983876, fleteFormularios: 1509200, patentamiento: 2263800 },
  { codigo: "00-359-AL2-1", modelo: "CRONOS LIKE 1.3 GSE MY26", precioOficial: 36650000, precioTaraborelli: 29466600, fleteFormularios: 1466000, patentamiento: 2199000 },
  { codigo: "00-359-AF2-1", modelo: "CRONOS DRIVE 1.3 GSE PACK PLUS (OPT AQZ) MY26", precioOficial: 43121330, precioTaraborelli: 30400538, fleteFormularios: 1724853, patentamiento: 2587280 },
  { codigo: "00-359-AFK-1", modelo: "CRONOS DRIVE 1.3 GSE CVT PACK PLUS (OPT AQZ) MY26", precioOficial: 44760000, precioTaraborelli: 32710608, fleteFormularios: 1790400, patentamiento: 2685600 },
  { codigo: "00-359-AHK-1", modelo: "CRONOS PRECISION 1.3 GSE CVT MY26", precioOficial: 45270000, precioTaraborelli: 35804043, fleteFormularios: 1810800, patentamiento: 2716200 },
  { codigo: "359-AK2-1", modelo: "CRONOS DRIVE PLUS 1.3 MT MY27", precioOficial: 39210000, precioTaraborelli: 32363934, fleteFormularios: 1568400, patentamiento: 2352600 },
  { codigo: "364B242", modelo: "FIAT 600 MHEV 1.2 AT", precioOficial: 49340000, precioTaraborelli: 38110216, fleteFormularios: 1973600, patentamiento: 2960400 },
  { codigo: "00-363-BM4-1", modelo: "PULSE DRIVE 1.3 MT5 (MY26)", precioOficial: 43920000, precioTaraborelli: 33041016, fleteFormularios: 1756800, patentamiento: 2635200 },
  { codigo: "00-363-BN6-1", modelo: "PULSE DRIVE 1.3 CVT (MY26)", precioOficial: 44550000, precioTaraborelli: 35617725, fleteFormularios: 1782000, patentamiento: 2673000 },
  { codigo: "00-363-BP2-1", modelo: "PULSE AUDACE 1.0T CVT (MY26)", precioOficial: 47660000, precioTaraborelli: 37699060, fleteFormularios: 1906400, patentamiento: 2859600 },
  { codigo: "00-363-BR2-1", modelo: "PULSE IMPETUS 1.0T CVT (MY26)", precioOficial: 49300000, precioTaraborelli: 40056250, fleteFormularios: 1972000, patentamiento: 2958000 },
  { codigo: "00-363-BSY-1", modelo: "PULSE ABARTH T270 AT6 (MY26)", precioOficial: 50210000, precioTaraborelli: 44029149, fleteFormularios: 2008400, patentamiento: 3012600 },
  { codigo: "00-376-BM8-1", modelo: "FASTBACK TURBO 270 AT6 (MY26)", precioOficial: 54250000, precioTaraborelli: 41202875, fleteFormularios: 2170000, patentamiento: 3255000 },
  { codigo: "00-376-BN8-1", modelo: "FASTBACK ABARTH T270 AT6 (MY26)", precioOficial: 55750000, precioTaraborelli: 46489925, fleteFormularios: 2230000, patentamiento: 3345000 },
  { codigo: "00-265-4PN-1", modelo: "FIORINO ENDURANCE 1.3L MT", precioOficial: 34510000, precioTaraborelli: 28139454, fleteFormularios: 1380400, patentamiento: 2070600 },
  { codigo: "00-281-CKV-1", modelo: "STRADA FREEDOM 1.3 8V Cabina simple 1.3 8V MT", precioOficial: 38180000, precioTaraborelli: 32659172, fleteFormularios: 1527200, patentamiento: 2290800 },
  { codigo: "00-281-DKV-1", modelo: "STRADA FREEDOM 1.3 8V CD", precioOficial: 44250000, precioTaraborelli: 34497300, fleteFormularios: 1770000, patentamiento: 2655000 },
  { codigo: "00-281-DLW-1", modelo: "STRADA VOLCANO 1.3 8V CD CVT", precioOficial: 47240000, precioTaraborelli: 36015776, fleteFormularios: 1889600, patentamiento: 2834400 },
  { codigo: "00-281-DNX-1", modelo: "STRADA RANCH T200 CVT", precioOficial: 52592800, precioTaraborelli: 40391270, fleteFormularios: 2103712, patentamiento: 3155568 },
  { codigo: "00-281-DMX-1", modelo: "STRADA ULTRA T200 CD CVT", precioOficial: 52750000, precioTaraborelli: 40512000, fleteFormularios: 2110000, patentamiento: 3165000 },
  { codigo: "00-226-5R9-2", modelo: "TORO FREEDOM 1.3T AT6 4X2 MY26", precioOficial: 55730000, precioTaraborelli: 43848364, fleteFormularios: 2229200, patentamiento: 3343800 },
  { codigo: "00-226-5S9-2", modelo: "TORO VOLCANO 1.3T AT6 4X2 MY26", precioOficial: 61300000, precioTaraborelli: 47703660, fleteFormularios: 2452000, patentamiento: 3678000 },
  { codigo: "00-226-5ST-2", modelo: "TORO VOLCANO 2.2 TD AT9 4x4 MY26", precioOficial: 64150000, precioTaraborelli: 55618050, fleteFormularios: 2566000, patentamiento: 3849000 },
  { codigo: "00-579-1C4-3", modelo: "TITANO ENDURANCE MT", precioOficial: 54480000, precioTaraborelli: 44809800, fleteFormularios: 2179200, patentamiento: 3268800 },
  { codigo: "00-579-1C5-3", modelo: "TITANO ENDURANCE MT 4WD", precioOficial: 59390000, precioTaraborelli: 50641853, fleteFormularios: 2375600, patentamiento: 3563400 },
  { codigo: "00-579-1H5-3", modelo: "TITANO FREEDOM MT 4WD", precioOficial: 65390000, precioTaraborelli: 50134513, fleteFormularios: 2615600, patentamiento: 3923400 },
  { codigo: "00-579-1H6-3", modelo: "TITANO FREEDOM PLUS AT8 AWD", precioOficial: 69720000, precioTaraborelli: 57044904, fleteFormularios: 2788800, patentamiento: 4183200 },
  { codigo: "00-579-1N6-3", modelo: "TITANO RANCH AT AWD", precioOficial: 75270000, precioTaraborelli: 60291270, fleteFormularios: 3010800, patentamiento: 4516200 },
];
