import { describe, expect, it } from "vitest";
import {
  calcularMetricasComerciales,
  diasEnProceso,
  empresasPorEstado,
  filasDetalle,
  probabilidadPorEstado,
  type RangoFechas,
} from "@/lib/reportes";
import { crearEmpresa } from "@/lib/test-helpers";

const RANGO: RangoFechas = { desde: "2026-01-01", hasta: "2026-12-31" };
const HOY = "2026-06-15";

describe("calcularMetricasComerciales", () => {
  it("conversión es 0 cuando no hay cerradas en el rango", () => {
    const empresas = [
      crearEmpresa({ estado: "Pendiente", montoResultado: 1000 }),
      crearEmpresa({ estado: "En avance", montoResultado: 2000 }),
    ];
    const m = calcularMetricasComerciales(empresas, RANGO);
    expect(m.conversion).toBe(0);
    expect(m.ganadas).toBe(0);
    expect(m.perdidas).toBe(0);
  });

  it("conversión es 50 con una ganada y una perdida", () => {
    const empresas = [
      crearEmpresa({
        estado: "Cerrada - Ganada",
        montoResultado: 5000,
        fechaActualizacion: "2026-03-10T00:00:00.000Z",
      }),
      crearEmpresa({
        estado: "Cerrada - No concretada",
        fechaActualizacion: "2026-04-01T00:00:00.000Z",
      }),
    ];
    const m = calcularMetricasComerciales(empresas, RANGO);
    expect(m.conversion).toBe(50);
    expect(m.ganadas).toBe(1);
    expect(m.perdidas).toBe(1);
    expect(m.valorGanado).toBe(5000);
  });

  it("el pipeline solo suma montos de oportunidades abiertas", () => {
    const empresas = [
      crearEmpresa({ estado: "Pendiente", montoResultado: 1000 }),
      crearEmpresa({ estado: "En pláticas", montoResultado: 2500 }),
      crearEmpresa({
        estado: "Cerrada - Ganada",
        montoResultado: 9999,
        fechaActualizacion: "2026-02-02T00:00:00.000Z",
      }),
      crearEmpresa({ estado: "En avance", montoResultado: null }),
    ];
    const m = calcularMetricasComerciales(empresas, RANGO);
    expect(m.pipeline).toBe(3500);
    expect(m.abiertas).toBe(3);
  });

  it("ignora las cerradas fuera del rango", () => {
    const empresas = [
      crearEmpresa({
        estado: "Cerrada - Ganada",
        fechaActualizacion: "2025-12-31T00:00:00.000Z",
      }),
    ];
    const m = calcularMetricasComerciales(empresas, RANGO);
    expect(m.ganadas).toBe(0);
    expect(m.conversion).toBe(0);
  });

  it("calcula el ciclo promedio de cierre en días", () => {
    const empresas = [
      crearEmpresa({
        estado: "Cerrada - Ganada",
        fechaCreacion: "2026-01-01T00:00:00.000Z",
        fechaActualizacion: "2026-01-11T00:00:00.000Z", // 10 días
      }),
      crearEmpresa({
        estado: "Cerrada - No concretada",
        fechaCreacion: "2026-01-01T00:00:00.000Z",
        fechaActualizacion: "2026-01-21T00:00:00.000Z", // 20 días
      }),
    ];
    const m = calcularMetricasComerciales(empresas, RANGO);
    expect(m.cicloPromedioDias).toBe(15);
  });
});

describe("diasEnProceso", () => {
  it("de creación a cierre para empresas cerradas", () => {
    const e = crearEmpresa({
      estado: "Cerrada - Ganada",
      fechaCreacion: "2026-01-01T00:00:00.000Z",
      fechaActualizacion: "2026-01-08T00:00:00.000Z",
    });
    expect(diasEnProceso(e, HOY)).toBe(7);
  });

  it("de creación a hoy para empresas abiertas", () => {
    const e = crearEmpresa({
      estado: "En avance",
      fechaCreacion: "2026-06-05T00:00:00.000Z",
    });
    expect(diasEnProceso(e, HOY)).toBe(10);
  });
});

describe("empresasPorEstado", () => {
  it("cuenta por estado incluyendo los que están en cero", () => {
    const conteo = empresasPorEstado([
      crearEmpresa({ estado: "Pendiente" }),
      crearEmpresa({ estado: "Pendiente" }),
      crearEmpresa({ estado: "En avance" }),
    ]);
    expect(conteo["Pendiente"]).toBe(2);
    expect(conteo["En avance"]).toBe(1);
    expect(conteo["Futura"]).toBe(0);
    expect(conteo["Cerrada - Ganada"]).toBe(0);
  });
});

describe("filasDetalle", () => {
  it("ordena por monto descendente y mapea el resultado", () => {
    const filas = filasDetalle(
      [
        crearEmpresa({ nombre: "Chica", estado: "Pendiente", montoResultado: 100 }),
        crearEmpresa({
          nombre: "Grande",
          estado: "Cerrada - Ganada",
          montoResultado: 9000,
        }),
        crearEmpresa({
          nombre: "Perdida",
          estado: "Cerrada - No concretada",
          montoResultado: 500,
        }),
      ],
      HOY,
    );
    expect(filas.map((f) => f.empresa)).toEqual(["Grande", "Perdida", "Chica"]);
    expect(filas[0].resultado).toBe("Ganada");
    expect(filas[1].resultado).toBe("Perdida");
    expect(filas[2].resultado).toBe("Abierta");
  });
});

describe("probabilidadPorEstado", () => {
  it("asigna la probabilidad esperada", () => {
    expect(probabilidadPorEstado("Cerrada - Ganada")).toBe(100);
    expect(probabilidadPorEstado("Cerrada - No concretada")).toBe(0);
    expect(probabilidadPorEstado("En avance")).toBe(75);
  });
});
