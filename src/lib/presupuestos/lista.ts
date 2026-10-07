/**
 * Lista de precios incluida en la app (se usa hasta que se cargue otra desde /presupuestos).
 * Fuente: hoja "OCTUBRE VIGENTE 0610" del Excel de listas, vigente desde el 06/10/2026.
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

export const LISTA_BASE = "OCTUBRE VIGENTE 0610";

export const VEHICULOS: Vehiculo[] = [
  { codigo: "00-341-AB1-0", modelo: "MOBI TREKKING 1.0", precioOficial: 30280000, precioTaraborelli: 28980988, fleteFormularios: 1211200, patentamiento: 1816800 },
  { codigo: "00-341-ABB-0", modelo: "MOBI TREKKING 1.0 MT", precioOficial: 30280000, precioTaraborelli: 28980988, fleteFormularios: 1211200, patentamiento: 1816800 },
  { codigo: "00-358-AF2-1", modelo: "ARGO DRIVE 1.3L MT MY26", precioOficial: 34100000, precioTaraborelli: 27071990, fleteFormularios: 1364000, patentamiento: 2046000 },
  { codigo: "00-358-AFK-1", modelo: "ARGO DRIVE 1.3 CVT MY26", precioOficial: 36270000, precioTaraborelli: 30510324, fleteFormularios: 1450800, patentamiento: 2176200 },
  { codigo: "00-359-AL2-1", modelo: "CRONOS LIKE 1.3 GSE MY26", precioOficial: 35100000, precioTaraborelli: 28922400, fleteFormularios: 1404000, patentamiento: 2106000 },
  { codigo: "00-359-AF2-1", modelo: "CRONOS DRIVE 1.3 GSE PACK PLUS (OPT AQZ) MY26", precioOficial: 41300000, precioTaraborelli: 29942500, fleteFormularios: 1652000, patentamiento: 2478000 },
  { codigo: "00-359-AFK-1", modelo: "CRONOS DRIVE 1.3 GSE CVT PACK PLUS (OPT AQZ) MY26", precioOficial: 42870000, precioTaraborelli: 32186796, fleteFormularios: 1714800, patentamiento: 2572200 },
  { codigo: "00-359-AHK-1", modelo: "CRONOS PRECISION 1.3 GSE CVT MY26", precioOficial: 43520000, precioTaraborelli: 35290368, fleteFormularios: 1740800, patentamiento: 2611200 },
  { codigo: "359-AK2-1", modelo: "CRONOS DRIVE PLUS 1.3 MT MY27", precioOficial: 37550000, precioTaraborelli: 31744770, fleteFormularios: 1502000, patentamiento: 2253000 },
  { codigo: "364B242", modelo: "FIAT 600 MHEV 1.2 AT", precioOficial: 49340000, precioTaraborelli: 38110216, fleteFormularios: 1973600, patentamiento: 2960400 },
  { codigo: "00-363-BM4-1", modelo: "PULSE DRIVE 1.3 MT5 (MY26)", precioOficial: 42230000, precioTaraborelli: 32614229, fleteFormularios: 1689200, patentamiento: 2533800 },
  { codigo: "00-363-BN6-1", modelo: "PULSE DRIVE 1.3 CVT (MY26)", precioOficial: 42830000, precioTaraborelli: 35099185, fleteFormularios: 1713200, patentamiento: 2569800 },
  { codigo: "00-363-BP2-1", modelo: "PULSE AUDACE 1.0T CVT (MY26)", precioOficial: 45820000, precioTaraborelli: 37160020, fleteFormularios: 1832800, patentamiento: 2749200 },
  { codigo: "00-363-BR2-1", modelo: "PULSE IMPETUS 1.0T CVT (MY26)", precioOficial: 47400000, precioTaraborelli: 39460500, fleteFormularios: 1896000, patentamiento: 2844000 },
  { codigo: "00-363-BSY-1", modelo: "PULSE ABARTH T270 AT6 (MY26)", precioOficial: 48270000, precioTaraborelli: 43293363, fleteFormularios: 1930800, patentamiento: 2896200 },
  { codigo: "00-376-BM8-1", modelo: "FASTBACK TURBO 270 AT6 (MY26)", precioOficial: 52160000, precioTaraborelli: 40658720, fleteFormularios: 2086400, patentamiento: 3129600 },
  { codigo: "00-376-BN8-1", modelo: "FASTBACK ABARTH T270 AT6 (MY26)", precioOficial: 53600000, precioTaraborelli: 45769040, fleteFormularios: 2144000, patentamiento: 3216000 },
  { codigo: "00-265-4PN-1", modelo: "FIORINO ENDURANCE 1.3L MT", precioOficial: 33180000, precioTaraborelli: 27718572, fleteFormularios: 1327200, patentamiento: 1990800 },
  { codigo: "00-281-CKV-1", modelo: "STRADA FREEDOM 1.3 8V Cabina simple 1.3 8V MT", precioOficial: 36710000, precioTaraborelli: 32135934, fleteFormularios: 1468400, patentamiento: 2202600 },
  { codigo: "00-281-DKV-1", modelo: "STRADA FREEDOM 1.3 8V CD", precioOficial: 42540000, precioTaraborelli: 34014984, fleteFormularios: 1701600, patentamiento: 2552400 },
  { codigo: "00-281-DLW-1", modelo: "STRADA VOLCANO 1.3 8V CD CVT", precioOficial: 45420000, precioTaraborelli: 35536608, fleteFormularios: 1816800, patentamiento: 2725200 },
  { codigo: "00-281-DNX-1", modelo: "STRADA RANCH T200 CVT", precioOficial: 50570000, precioTaraborelli: 39849160, fleteFormularios: 2022800, patentamiento: 3034200 },
  { codigo: "00-281-DMX-1", modelo: "STRADA ULTRA T200 CD CVT", precioOficial: 50720000, precioTaraborelli: 39967360, fleteFormularios: 2028800, patentamiento: 3043200 },
  { codigo: "00-226-5R9-2", modelo: "TORO FREEDOM 1.3T AT6 4X2 MY26", precioOficial: 53580000, precioTaraborelli: 43228344, fleteFormularios: 2143200, patentamiento: 3214800 },
  { codigo: "00-226-5S9-2", modelo: "TORO VOLCANO 1.3T AT6 4X2 MY26", precioOficial: 58940000, precioTaraborelli: 47045908, fleteFormularios: 2357600, patentamiento: 3536400 },
  { codigo: "00-226-5ST-2", modelo: "TORO VOLCANO 2.2 TD AT9 4x4 MY26", precioOficial: 61680000, precioTaraborelli: 54710160, fleteFormularios: 2467200, patentamiento: 3700800 },
  { codigo: "00-579-1C4-3", modelo: "TITANO ENDURANCE MT", precioOficial: 52380000, precioTaraborelli: 44130150, fleteFormularios: 2095200, patentamiento: 3142800 },
  { codigo: "00-579-1C5-3", modelo: "TITANO ENDURANCE MT 4WD", precioOficial: 57100000, precioTaraborelli: 49831170, fleteFormularios: 2284000, patentamiento: 3426000 },
  { codigo: "00-579-1H5-3", modelo: "TITANO FREEDOM MT 4WD", precioOficial: 62870000, precioTaraborelli: 49459829, fleteFormularios: 2514800, patentamiento: 3772200 },
  { codigo: "00-579-1H6-3", modelo: "TITANO FREEDOM PLUS AT8 AWD", precioOficial: 67030000, precioTaraborelli: 56184546, fleteFormularios: 2681200, patentamiento: 4021800 },
  { codigo: "00-579-1N6-3", modelo: "TITANO RANCH AT AWD", precioOficial: 72370000, precioTaraborelli: 59415770, fleteFormularios: 2894800, patentamiento: 4342200 },
];
