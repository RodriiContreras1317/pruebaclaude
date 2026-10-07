import ExcelJS from "exceljs";
import { describe, expect, it } from "vitest";
import { parsearCircular } from "@/lib/presupuestos/parse-circular";
import { abrirLibro, hojaSugerida, hojasDeLista, leerHoja } from "@/lib/presupuestos/parse-lista";
import { PRODUCTOS } from "@/lib/presupuestos/productos";

// Líneas tal como salen del PDF de la Circular N° 016.26 (agrupadas por altura).
const LINEAS_CIRCULAR = `CIRCULAR COMERCIAL NRO. 016.26
POLÍTICA COMERCIAL
VIGENCIA: OCTUBRE / 2026
PROMOCIONES 0 Km
Máx. a Financiar PLAZO TNA 1.000 MODELOS CANAL
18 0,0% 11,0% $ 56,22
$ 18.000.000 24 10,9% 11,0% $ 48,95
36 20,9% 11,0% $ 41,58
CAMPAÑA FIAT TASA FIJA
12 0,0% 11,0% $ 84,33 TODA LA GAMA TRAD
18 8,9% 11,0% $ 61,76
$ 24.000.000
24 17,9% 11,0% $ 53,48
36 25,9% 11,0% $ 45,05
12 0,0% 12,0% $ 84,33
CAMPAÑA FIAT TASA FIJA
18 0,0% 12,0% $ 56,22
$ 28.000.000 CRONOS, PULSE, FASTBACK y TRAD
24 5,9% 12,0% $ 45,80 TORO
36 18,9% 12,0% $ 40,21
12 0,0% 6,0% $ 84,33
18 0,0% 10,0% $ 56,22
PROMOCIONES
PROMO UVA FIAT
24 0,0% 10,0% $ 42,17
$ 30.000.000 TODA LA GAMA TRAD
36 0,0% 12,0% $ 28,11
48 5,9% 12,0% $ 24,71
60 9,9% 12,0% $ 23,11
12 0,0% 10,0% $ 84,33
18 13,9% 10,0% $ 64,95
24 21,9% 10,0% $ 56,13
$ 35.000.000 TITANO TRAD
36 28,9% 10,0% $ 47,18
48 31,9% 10,0% $ 42,88
60 34,9% 10,0% $ 41,64
18 0,0% 11,0% $ 56,22
$ 18.000.000 24 10,9% 11,0% $ 48,95 TAXIS (IVA 10,5%) TRAD
36 20,9% 11,0% $ 41,58
12 23,9% 0,0% $ 99,66
50% PLAN UVA RENT A CAR TRAD - VE
24 23,9% 0,0% $ 57,46
FINANCIACIÓN 0 Km
12 45,9% 0,0% $ 114,43
18 45,9% 0,0% $ 86,49
24 45,9% 0,0% $ 72,86 Linea Tradicional TRAD -
36 45,9% 0,0% $ 59,87 0 Km VE(2)
48 45,9% 0,0% $ 53,96
60 45,9% 0,0% $ 50,84
12 21,9% 10,0% $ 98,35
18 28,9% 10,0% $ 74,80
24 31,9% 10,0% $ 62,92 Linea Tradicional 10%
36 35,9% 10,0% $ 52,28 0 Km
48 37,9% 10,0% $ 47,53
60 39,9% 10,0% $ 45,75
12 11,9% 15,0% $ 91,87
18 20,9% 15,0% $ 69,49
24 25,9% 15,0% $ 58,81 Linea Tradicional 15%
36 31,9% 15,0% $ 49,35 0 Km
48 34,9% 15,0% $ 45,18
60 35,9% 15,0% $ 42,45
UVA TRADICIONAL
12 23,9% 0,0% $ 99,66
24 23,9% 0,0% $ 57,46
70% 36 23,9% 0,0% $ 43,65
48 23,9% 0,0% $ 36,93
60 23,9% 0,0% $ 33,04
12 4,9% 10,0% $ 87,41
24 12,9% 10,0% $ 50,23
70% 36 15,9% 10,0% $ 38,20 TRAD
48 17,9% 10,0% $ 32,67
60 17,9% 10,0% $ 28,64
12 0,0% 13,0% $ 84,33
24 6,9% 15,0% $ 46,43
70% 36 12,9% 15,0% $ 36,22 TRAD
48 15,9% 15,0% $ 31,29
60 16,9% 15,0% $ 27,92
VENTAS ESPECIALES 0 Km
12 4,5% 0,0% $ 87,16`.split("\n");

describe("parsearCircular", () => {
  it("lee la circular 016.26 igual a los productos base", () => {
    const circular = parsearCircular(LINEAS_CIRCULAR);
    expect(circular.nombre).toBe("Circular 016.26 · Octubre 2026");
    expect(circular.productos).toEqual(PRODUCTOS);
  });

  it("toma los cambios de tasas y topes", () => {
    const lineas = LINEAS_CIRCULAR.map((l) =>
      l.replace("$ 18.000.000 24 10,9%", "$ 20.000.000 24 12,9%").replace("12 4,9% 10,0% $ 87,41", "12 5,9% 10,0% $ 88,05"),
    );
    const { productos } = parsearCircular(lineas);
    const fija = productos.find((p) => p.id === "fija-18")!;
    expect(fija.tope).toBe(20_000_000);
    expect(fija.nombre).toBe("Tasa Fija $20M");
    expect(fija.plazos[1]).toEqual({ meses: 24, tna: 0.129, aporteCE: 0.11, coeficiente: 48.95 });
    expect(productos.find((p) => p.id === "uva-trad-10")!.plazos[0]).toEqual({ meses: 12, tna: 0.059, aporteCE: 0.1, coeficiente: 88.05 });
  });

  it("rechaza un PDF que no es la circular", () => {
    expect(() => parsearCircular(["Hola", "Otro documento"])).toThrow(/no encontré el número/i);
  });

  it("avisa si faltan productos", () => {
    const corta = LINEAS_CIRCULAR.filter((l) => !l.startsWith("FINANCIACIÓN"));
    expect(() => parsearCircular(corta)).toThrow(/Financiación/);
  });
});

async function libroDePrueba() {
  const libro = new ExcelJS.Workbook();
  libro.addWorksheet("Notas").addRow(["nada que ver"]);
  for (const nombre of ["Lista Septiembre", "OCTUBRE VIGENTE 0610"]) {
    const hoja = libro.addWorksheet(nombre);
    hoja.addRow(["FIAT TARABORELLI"]);
    hoja.addRow([null, "LISTA DE PRECIOS"]);
    hoja.addRow(["CODIGO MODELO", "MODELO-VERSION", "Stock", "Precio Oficial", "Precio TARABORELLI", "Flete, Form. 01, G. varios", "Patentamiento"]);
    hoja.addRow([null, null, null, null, null, 0.04, 0.06]);
    hoja.addRow(["00-341-AB1-0", "MOBI TREKKING 1.0", 2, 30280000, { formula: "D5*0.95", result: 28766000 }, 1211200, 1816800]);
    hoja.addRow([]);
    hoja.addRow(["364B242", "FIAT 600 MHEV 1.2 AT", 26, 49340000, 38110216.4, 1973600, 2960400]);
    hoja.addRow([null, "** Versiones discontinuadas"]);
    hoja.addRow(["X", "VIEJO", 0, 1, 1, 1, 1]);
  }
  const buffer = await libro.xlsx.writeBuffer();
  return abrirLibro(buffer as ArrayBuffer);
}

describe("lista de precios", () => {
  it("encuentra las hojas con formato de lista y sugiere la vigente", async () => {
    const libro = await libroDePrueba();
    const hojas = hojasDeLista(libro);
    expect(hojas).toEqual(["Lista Septiembre", "OCTUBRE VIGENTE 0610"]);
    expect(hojaSugerida(hojas)).toBe("OCTUBRE VIGENTE 0610");
  });

  it("lee los modelos hasta las versiones discontinuadas", async () => {
    const { vehiculos } = leerHoja(await libroDePrueba(), "OCTUBRE VIGENTE 0610");
    expect(vehiculos).toEqual([
      { codigo: "00-341-AB1-0", modelo: "MOBI TREKKING 1.0", precioOficial: 30280000, precioTaraborelli: 28766000, fleteFormularios: 1211200, patentamiento: 1816800 },
      { codigo: "364B242", modelo: "FIAT 600 MHEV 1.2 AT", precioOficial: 49340000, precioTaraborelli: 38110216, fleteFormularios: 1973600, patentamiento: 2960400 },
    ]);
  });

  it("rechaza una hoja sin formato de lista", async () => {
    expect(() => leerHoja(new ExcelJS.Workbook(), "Nada")).toThrow(/No existe/);
    const libro = await libroDePrueba();
    expect(() => leerHoja(libro, "Notas")).toThrow(/formato/);
  });
});
