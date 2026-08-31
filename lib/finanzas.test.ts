import { describe, expect, it } from "vitest";
import { margen, saldoEnCaja, utilidadNeta } from "@/lib/finanzas";

describe("utilidadNeta", () => {
  it("resta egresos de ingresos", () => {
    expect(utilidadNeta(1000, 400)).toBe(600);
  });

  it("puede ser negativa", () => {
    expect(utilidadNeta(200, 500)).toBe(-300);
  });

  it("evita imprecisiones de punto flotante", () => {
    // 0.3 - 0.2 = 0.09999999999999998 en coma flotante
    expect(utilidadNeta(0.3, 0.2)).toBe(0.1);
  });
});

describe("margen", () => {
  it("es 0 cuando los ingresos son 0", () => {
    expect(margen(0, 0)).toBe(0);
    expect(margen(0, 500)).toBe(0);
  });

  it("es 0 cuando los ingresos son negativos", () => {
    expect(margen(-100, 50)).toBe(0);
  });

  it("es 0 cuando los ingresos no son finitos", () => {
    expect(margen(Number.NaN, 10)).toBe(0);
    expect(margen(Number.POSITIVE_INFINITY, 10)).toBe(0);
  });

  it("calcula el porcentaje de utilidad sobre ingresos", () => {
    expect(margen(1000, 750)).toBe(25);
    expect(margen(2000, 2500)).toBe(-25);
  });
});

describe("saldoEnCaja", () => {
  it("solo suma los movimientos liquidados", () => {
    const saldo = saldoEnCaja([
      { monto: 1000, tipo: "ingreso", liquidado: true },
      { monto: 300, tipo: "egreso", liquidado: true },
      { monto: 5000, tipo: "ingreso", liquidado: false },
      { monto: 999, tipo: "egreso", liquidado: false },
    ]);
    expect(saldo).toBe(700);
  });

  it("es 0 sin movimientos", () => {
    expect(saldoEnCaja([])).toBe(0);
  });
});
