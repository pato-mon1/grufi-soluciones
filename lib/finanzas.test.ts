import { describe, expect, it } from "vitest";
import {
  avanceMeta,
  flujoAnual,
  margen,
  rentabilidadPorEmpresa,
  resumirFinanzas,
  saldoEnCaja,
  totalesPorCategoria,
  utilidadNeta,
} from "@/lib/finanzas";
import { crearEmpresa, crearMovimiento } from "@/lib/test-helpers";
import type { CategoriaFinanza } from "@/lib/types";

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

describe("resumirFinanzas", () => {
  const movimientos = [
    crearMovimiento({ tipo: "ingreso", monto: 1000, estado: "liquidado", fecha: "2026-03-05" }),
    crearMovimiento({ tipo: "egreso", monto: 400, estado: "liquidado", fecha: "2026-03-10" }),
    crearMovimiento({ tipo: "ingreso", monto: 5000, estado: "pendiente", fecha: "2026-03-20" }),
    crearMovimiento({ tipo: "egreso", monto: 250, estado: "pendiente", fecha: "2026-03-25" }),
    crearMovimiento({ tipo: "ingreso", monto: 800, estado: "cancelado", fecha: "2026-03-28" }),
  ];

  it("suma liquidados, ignora cancelados y separa pendientes", () => {
    const r = resumirFinanzas(movimientos, 0);
    expect(r.ingresos).toBe(1000);
    expect(r.egresos).toBe(400);
    expect(r.utilidadNeta).toBe(600);
    expect(r.margen).toBe(60);
    expect(r.porCobrar).toBe(5000);
    expect(r.porPagar).toBe(250);
  });

  it("el saldo de caja incluye el saldo inicial y todo lo liquidado", () => {
    const r = resumirFinanzas(movimientos, 2000);
    expect(r.saldoCaja).toBe(2600); // 2000 + 1000 - 400
  });

  it("margen 0 cuando no hay ingresos liquidados", () => {
    const r = resumirFinanzas(
      [crearMovimiento({ tipo: "egreso", monto: 500, estado: "liquidado" })],
      0,
    );
    expect(r.ingresos).toBe(0);
    expect(r.margen).toBe(0);
    expect(r.utilidadNeta).toBe(-500);
  });

  it("respeta el rango de fechas para ingresos/egresos pero no para el saldo", () => {
    const r = resumirFinanzas(movimientos, 0, {
      desde: "2026-03-01",
      hasta: "2026-03-08",
    });
    expect(r.ingresos).toBe(1000);
    expect(r.egresos).toBe(0); // el egreso del 10-mar queda fuera
    expect(r.saldoCaja).toBe(600); // acumulado completo: 1000 - 400
  });
});

describe("totalesPorCategoria", () => {
  const cats: CategoriaFinanza[] = [
    {
      id: "c1",
      nombre: "Servicios",
      tipo: "ingreso",
      color: "#111111",
      archivada: false,
      fechaCreacion: "",
      fechaActualizacion: "",
    },
  ];

  it("agrupa liquidados por categoría y ordena por total desc", () => {
    const filas = totalesPorCategoria(
      [
        crearMovimiento({ tipo: "ingreso", monto: 300, categoriaId: "c1", estado: "liquidado" }),
        crearMovimiento({ tipo: "ingreso", monto: 700, categoriaId: "c1", estado: "liquidado" }),
        crearMovimiento({ tipo: "ingreso", monto: 500, categoriaId: null, estado: "liquidado" }),
        crearMovimiento({ tipo: "ingreso", monto: 999, categoriaId: "c1", estado: "pendiente" }),
      ],
      cats,
      "ingreso",
    );
    expect(filas).toEqual([
      { categoriaId: "c1", nombre: "Servicios", color: "#111111", tipo: "ingreso", total: 1000 },
      { categoriaId: null, nombre: "Sin categoría", color: "#77736B", tipo: "ingreso", total: 500 },
    ]);
  });
});

describe("rentabilidadPorEmpresa", () => {
  it("calcula utilidad liquidada por empresa, mayor primero", () => {
    const empresas = [
      crearEmpresa({ id: "e1", nombre: "Alfa" }),
      crearEmpresa({ id: "e2", nombre: "Beta" }),
    ];
    const filas = rentabilidadPorEmpresa(
      [
        crearMovimiento({ empresaId: "e1", tipo: "ingreso", monto: 1000, estado: "liquidado" }),
        crearMovimiento({ empresaId: "e1", tipo: "egreso", monto: 200, estado: "liquidado" }),
        crearMovimiento({ empresaId: "e2", tipo: "ingreso", monto: 300, estado: "liquidado" }),
        crearMovimiento({ empresaId: null, tipo: "ingreso", monto: 9999, estado: "liquidado" }),
      ],
      empresas,
    );
    expect(filas).toEqual([
      { empresaId: "e1", nombre: "Alfa", ingresos: 1000, egresos: 200, utilidad: 800 },
      { empresaId: "e2", nombre: "Beta", ingresos: 300, egresos: 0, utilidad: 300 },
    ]);
  });
});

describe("flujoAnual", () => {
  it("devuelve 12 meses y suma liquidados por mes del año pedido", () => {
    const flujo = flujoAnual(
      [
        crearMovimiento({ tipo: "ingreso", monto: 100, estado: "liquidado", fecha: "2026-01-15" }),
        crearMovimiento({ tipo: "ingreso", monto: 50, estado: "liquidado", fecha: "2026-01-20" }),
        crearMovimiento({ tipo: "egreso", monto: 30, estado: "liquidado", fecha: "2026-02-01" }),
        crearMovimiento({ tipo: "ingreso", monto: 999, estado: "liquidado", fecha: "2025-01-01" }),
        crearMovimiento({ tipo: "ingreso", monto: 999, estado: "pendiente", fecha: "2026-01-01" }),
      ],
      2026,
    );
    expect(flujo).toHaveLength(12);
    expect(flujo[0]).toEqual({ mes: 0, etiqueta: "Ene", ingresos: 150, egresos: 0 });
    expect(flujo[1]).toEqual({ mes: 1, etiqueta: "Feb", ingresos: 0, egresos: 30 });
    expect(flujo[5].ingresos).toBe(0);
  });
});

describe("avanceMeta", () => {
  it("es 0 si la meta es 0 o negativa", () => {
    expect(avanceMeta(5000, 0)).toBe(0);
    expect(avanceMeta(5000, -1)).toBe(0);
  });
  it("devuelve el porcentaje con 1 decimal", () => {
    expect(avanceMeta(2500, 10000)).toBe(25);
    expect(avanceMeta(3333, 10000)).toBe(33.3);
  });
});
