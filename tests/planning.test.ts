import { describe, expect, it } from "vitest";
import {
  buildMonthPlan,
  distribute,
  getMonthWeeks,
  shiftMonth,
} from "@/lib/planning";

describe("getMonthWeeks", () => {
  it("mes que empieza a mitad de semana (octubre 2026 empieza jueves)", () => {
    const weeks = getMonthWeeks(2026, 10);

    expect(weeks).toHaveLength(5);
    expect(weeks[0]).toMatchObject({
      start: "2026-09-28",
      end: "2026-10-04",
      monthStart: "2026-10-01",
      monthEnd: "2026-10-04",
      businessDays: 2, // jueves 1 y viernes 2
    });
    expect(weeks[4]).toMatchObject({
      start: "2026-10-26",
      end: "2026-11-01",
      monthStart: "2026-10-26",
      monthEnd: "2026-10-31",
      businessDays: 5,
    });
    expect(weeks.map((w) => w.businessDays)).toEqual([2, 5, 5, 5, 5]);
  });

  it("mes de 5 semanas partido en ambos extremos (septiembre 2026)", () => {
    const weeks = getMonthWeeks(2026, 9);

    expect(weeks).toHaveLength(5);
    expect(weeks[0].start).toBe("2026-08-31");
    expect(weeks[4].end).toBe("2026-10-04");
    expect(weeks.map((w) => w.businessDays)).toEqual([4, 5, 5, 5, 3]);
  });

  it("mes que empieza en fin de semana tiene una primera semana sin días hábiles (agosto 2026, 6 semanas)", () => {
    const weeks = getMonthWeeks(2026, 8);

    expect(weeks).toHaveLength(6);
    expect(weeks[0]).toMatchObject({ monthStart: "2026-08-01", monthEnd: "2026-08-02", businessDays: 0 });
    expect(weeks.map((w) => w.businessDays)).toEqual([0, 5, 5, 5, 5, 1]);
  });

  it("mes que coincide exactamente con 4 semanas (febrero 2021)", () => {
    const weeks = getMonthWeeks(2021, 2);

    expect(weeks).toHaveLength(4);
    expect(weeks[0].start).toBe("2021-02-01");
    expect(weeks[3].end).toBe("2021-02-28");
  });
});

describe("distribute", () => {
  it("reparte en proporción y asigna el resto a las primeras semanas", () => {
    // 10 * 2/22 = 0.9 -> 0 ; 10 * 5/22 = 2.27 -> 2  => suma 8, sobran 2
    expect(distribute(10, [2, 5, 5, 5, 5])).toEqual([1, 3, 2, 2, 2]);
  });

  it("no asigna el resto a semanas sin días hábiles", () => {
    expect(distribute(10, [0, 5, 5, 5, 5, 1])).toEqual([0, 3, 3, 2, 2, 0]);
  });

  it("reparte en partes iguales si todos los pesos son cero", () => {
    expect(distribute(5, [0, 0])).toEqual([3, 2]);
  });

  it("devuelve ceros si el total es cero o negativo", () => {
    expect(distribute(0, [5, 5])).toEqual([0, 0]);
    expect(distribute(-3, [5, 5])).toEqual([0, 0]);
  });

  it("siempre devuelve enteros que suman exactamente el total", () => {
    for (let year = 2025; year <= 2027; year++) {
      for (let month = 1; month <= 12; month++) {
        const weights = getMonthWeeks(year, month).map((w) => w.businessDays);
        for (let goal = 0; goal <= 50; goal++) {
          const result = distribute(goal, weights);
          expect(result.every((n) => Number.isInteger(n) && n >= 0)).toBe(true);
          expect(result.reduce((a, b) => a + b, 0)).toBe(goal);
        }
      }
    }
  });
});

describe("buildMonthPlan", () => {
  // Octubre 2026: pesos [2, 5, 5, 5, 5] -> plan original [1, 3, 2, 2, 2]
  const base = { year: 2026, month: 10, goal: 10 };

  it("mes futuro: todo pendiente y el plan ajustado es igual al original", () => {
    const plan = buildMonthPlan({ ...base, saleDates: [], today: "2026-09-15" });

    expect(plan.weeks.map((w) => w.planned)).toEqual([1, 3, 2, 2, 2]);
    expect(plan.weeks.map((w) => w.adjusted)).toEqual([1, 3, 2, 2, 2]);
    expect(plan.weeks.every((w) => w.status === "pendiente")).toBe(true);
    expect(plan.currentWeek).toBeNull();
  });

  it("atrasado: recalcula más ventas para las semanas que quedan", () => {
    const plan = buildMonthPlan({
      ...base,
      saleDates: ["2026-10-07"], // 1 venta en la semana 2
      today: "2026-10-14", // miércoles de la semana 3
    });

    expect(plan.weeks.map((w) => w.actual)).toEqual([0, 1, 0, 0, 0]);
    expect(plan.weeks.map((w) => w.planned)).toEqual([1, 3, 2, 2, 2]);
    // Faltan 9 ventas para 3 semanas de 5 días hábiles.
    expect(plan.weeks.map((w) => w.adjusted)).toEqual([0, 1, 3, 3, 3]);
    expect(plan.weeks.map((w) => w.status)).toEqual([
      "atrasada",
      "atrasada",
      "en_curso",
      "pendiente",
      "pendiente",
    ]);
    expect(plan.deviation).toBe(-3);
    expect(plan.currentWeek?.index).toBe(2);
    expect(plan.remaining).toBe(9);
    expect(plan.percentage).toBe(10);
  });

  it("adelantado: reduce las ventas necesarias en las semanas que quedan", () => {
    const plan = buildMonthPlan({
      ...base,
      saleDates: [
        "2026-10-01",
        "2026-10-02",
        "2026-10-05",
        "2026-10-06",
        "2026-10-07",
        "2026-10-08",
        "2026-10-09",
      ],
      today: "2026-10-14",
    });

    expect(plan.weeks.map((w) => w.adjusted)).toEqual([2, 5, 1, 1, 1]);
    expect(plan.weeks[0].status).toBe("cumplida");
    expect(plan.weeks[1].status).toBe("cumplida");
    expect(plan.deviation).toBe(3);
    // El ajustado siempre suma el objetivo mientras no se haya superado.
    expect(plan.weeks.reduce((a, w) => a + w.adjusted, 0)).toBe(10);
  });

  it("objetivo superado: las semanas restantes quedan en cero", () => {
    const saleDates = [
      ...Array(4).fill("2026-10-02"),
      ...Array(8).fill("2026-10-08"),
    ];
    const plan = buildMonthPlan({ ...base, saleDates, today: "2026-10-14" });

    expect(plan.totalSales).toBe(12);
    expect(plan.remaining).toBe(0);
    expect(plan.percentage).toBe(120);
    expect(plan.weeks.map((w) => w.adjusted)).toEqual([4, 8, 0, 0, 0]);
    expect(plan.weeks[2].status).toBe("cumplida");
    expect(plan.weeks[3].status).toBe("pendiente");
  });

  it("cuenta las ventas de la semana en curso sin cambiar su plan ajustado", () => {
    const plan = buildMonthPlan({
      ...base,
      saleDates: ["2026-10-13"],
      today: "2026-10-14",
    });

    // Semanas 1 y 2 sin ventas: faltan 10 para 3 semanas -> [4, 3, 3]
    expect(plan.weeks.map((w) => w.adjusted)).toEqual([0, 0, 4, 3, 3]);
    expect(plan.currentWeek).toMatchObject({ actual: 1, adjusted: 4, status: "en_curso" });
  });

  it("la semana en curso figura como cumplida al alcanzar su plan ajustado", () => {
    const plan = buildMonthPlan({
      ...base,
      saleDates: ["2026-10-01", "2026-10-05", "2026-10-06", "2026-10-07", "2026-10-12", "2026-10-13"],
      today: "2026-10-14",
    });

    expect(plan.currentWeek).toMatchObject({ actual: 2, adjusted: 2, status: "cumplida" });
  });

  it("ignora ventas de días de la semana que caen fuera del mes", () => {
    const plan = buildMonthPlan({
      ...base,
      saleDates: ["2026-09-30", "2026-10-01", "2026-10-31", "2026-11-01"],
      today: "2026-11-10",
    });

    expect(plan.totalSales).toBe(2);
    expect(plan.weeks[0].actual).toBe(1);
    expect(plan.weeks[4].actual).toBe(1);
  });

  it("mes cerrado: el ajustado es igual a lo vendido y no hay semana en curso", () => {
    const plan = buildMonthPlan({
      ...base,
      saleDates: ["2026-10-01", "2026-10-06", "2026-10-07", "2026-10-08"],
      today: "2026-11-10",
    });

    expect(plan.weeks.map((w) => w.adjusted)).toEqual([1, 3, 0, 0, 0]);
    expect(plan.weeks.map((w) => w.status)).toEqual([
      "cumplida",
      "cumplida",
      "atrasada",
      "atrasada",
      "atrasada",
    ]);
    expect(plan.currentWeek).toBeNull();
  });

  it("mes de 6 semanas con primera semana sin días hábiles (agosto 2026)", () => {
    const plan = buildMonthPlan({
      year: 2026,
      month: 8,
      goal: 10,
      saleDates: [],
      today: "2026-08-01", // sábado 1
    });

    expect(plan.weeks.map((w) => w.planned)).toEqual([0, 3, 3, 2, 2, 0]);
    // La semana en curso no tiene días hábiles: no se marca como cumplida.
    expect(plan.currentWeek).toMatchObject({ index: 0, adjusted: 0, status: "en_curso" });
  });

  it("mes de 5 semanas con objetivo personalizado (septiembre 2026, 13 ventas)", () => {
    const plan = buildMonthPlan({
      year: 2026,
      month: 9,
      goal: 13,
      saleDates: [],
      today: "2026-08-01",
    });

    // 13 * [4,5,5,5,3]/22 = [2.36, 2.95, 2.95, 2.95, 1.77] -> [2,2,2,2,1] + resto 4
    expect(plan.weeks.map((w) => w.planned)).toEqual([3, 3, 3, 3, 1]);
  });
});

describe("shiftMonth", () => {
  it("navega entre años", () => {
    expect(shiftMonth(2026, 12, 1)).toEqual({ year: 2027, month: 1 });
    expect(shiftMonth(2026, 1, -1)).toEqual({ year: 2025, month: 12 });
    expect(shiftMonth(2026, 5, 0)).toEqual({ year: 2026, month: 5 });
  });
});
