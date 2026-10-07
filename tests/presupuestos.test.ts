import { describe, expect, it } from "vitest";
import { NOTAS, calcularContado, calcularFinanciado, calcularPlazo, montoMaximo, parsePesos } from "@/lib/presupuestos/calculo";
import { VEHICULOS } from "@/lib/presupuestos/lista";
import { PRODUCTOS, costoPrendario } from "@/lib/presupuestos/productos";

const vehiculo = (modelo: string) => VEHICULOS.find((v) => v.modelo === modelo)!;
const producto = (id: string) => PRODUCTOS.find((p) => p.id === id)!;

describe("costoPrendario", () => {
  it.each([
    [0.11, 0.1531],
    [0.12, 0.1652],
    [0.1, 0.141],
    [0.06, 0.0926],
    [0.15, 0.2015],
    [0, 0.02],
  ])("aporte %s → %s", (aporte, esperado) => {
    expect(costoPrendario(aporte)).toBe(esperado);
  });
});

describe("contado", () => {
  const mobi = vehiculo("MOBI TREKKING 1.0");

  it("solo precio", () => {
    const r = calcularContado(mobi, 28_000_000, { fleteFormularios: false, patentamiento: false });
    expect(r.total).toBe(28_000_000);
    expect(r.nota).toBeNull();
  });

  it("con flete/formularios", () => {
    const r = calcularContado(mobi, 28_000_000, { fleteFormularios: true, patentamiento: false });
    expect(r.total).toBe(28_000_000 + 1_211_200);
    expect(r.nota).toBe(NOTAS.soloFyF);
  });

  it("puesto en calle", () => {
    const r = calcularContado(mobi, 28_000_000, { fleteFormularios: true, patentamiento: true });
    expect(r.total).toBe(28_000_000 + 1_211_200 + 1_816_800);
    expect(r.nota).toBe(NOTAS.puestoEnCalle);
  });
});

describe("montoMaximo", () => {
  it("UVA $30M: el menor entre el tope y el 80% del oficial", () => {
    const mobi = vehiculo("MOBI TREKKING 1.0"); // 80% de 30.280.000 = 24.224.000
    expect(montoMaximo(producto("uva-30"), mobi, 40_000_000)).toBe(24_224_000);
    const titano = vehiculo("TITANO RANCH AT AWD");
    expect(montoMaximo(producto("uva-30"), titano, 70_000_000)).toBe(30_000_000);
  });

  it("nunca supera el puesto en calle", () => {
    expect(montoMaximo(producto("trad"), vehiculo("TITANO RANCH AT AWD"), 10_000_000)).toBe(10_000_000);
  });
});

describe("calcularPlazo", () => {
  it("el anticipo del cliente cubre diferencia + prenda", () => {
    const r = calcularPlazo(40_000_000, 25_000_000, 18_000_000, { meses: 18, tna: 0, aporteCE: 0.11, coeficiente: 56.22 });
    expect(r.anticipoInsuficiente).toBe(false);
    expect(r.montoFinanciado).toBe(Math.ceil(15_000_000 / (1 - 0.1531)));
    expect(r.anticipo).toBe(r.diferencia + r.prenda);
    expect(r.anticipo).toBe(25_000_000);
    expect(Math.abs(r.prenda - r.montoFinanciado * 0.1531)).toBeLessThanOrEqual(1);
    expect(r.cuota).toBe(Math.round((r.montoFinanciado * 56.22) / 1000));
  });

  it("si no alcanza, financia el máximo e informa el anticipo necesario", () => {
    const r = calcularPlazo(40_000_000, 5_000_000, 18_000_000, { meses: 18, tna: 0, aporteCE: 0.11, coeficiente: 56.22 });
    expect(r.anticipoInsuficiente).toBe(true);
    expect(r.montoFinanciado).toBe(18_000_000);
    expect(r.diferencia).toBe(22_000_000);
    expect(r.prenda).toBe(2_755_800);
    expect(r.anticipo).toBe(24_755_800);
    expect(r.cuota).toBe(1_011_960);
  });
});

describe("calcularFinanciado", () => {
  it("suma flete y patentamiento siempre", () => {
    const titano = vehiculo("TITANO ENDURANCE MT 4WD");
    const r = calcularFinanciado(titano, 50_000_000, 20_000_000);
    expect(r.puestoEnCalle).toBe(50_000_000 + 2_375_600 + 3_563_400);
  });

  it("promos primero y filtra por modelo", () => {
    const ids = (modelo: string) => calcularFinanciado(vehiculo(modelo), 30_000_000, 10_000_000).opciones.map((o) => o.producto.id);
    const mobi = ids("MOBI TREKKING 1.0");
    expect(mobi).not.toContain("fija-28");
    expect(mobi).not.toContain("titano-35");
    expect(mobi.slice(0, 3)).toEqual(["fija-18", "fija-24", "uva-30"]);
    expect(ids("CRONOS LIKE 1.3 GSE MY26")).toContain("fija-28");
    expect(ids("TITANO ENDURANCE MT")).toContain("titano-35");
    expect(ids("FIAT 600 MHEV 1.2 AT")).toContain("uva-30");
  });

  it("sin saldo si el anticipo cubre todo", () => {
    const r = calcularFinanciado(vehiculo("MOBI TREKKING 1.0"), 28_000_000, 40_000_000);
    expect(r.sinSaldo).toBe(true);
    expect(r.opciones).toEqual([]);
  });
});

describe("parsePesos", () => {
  it.each([
    ["$ 1.234.567", 1_234_567],
    ["1234567", 1_234_567],
    ["", 0],
  ])("%s", (input, esperado) => {
    expect(parsePesos(input)).toBe(esperado);
  });
});
