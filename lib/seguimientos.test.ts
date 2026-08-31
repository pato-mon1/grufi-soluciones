import { describe, expect, it } from "vitest";
import {
  clasificarSeguimiento,
  empresasParaSeguimiento,
  prioridadDeBucket,
  requiereAtencion,
  resumirSeguimientos,
} from "@/lib/seguimientos";
import { crearEmpresa } from "@/lib/test-helpers";

const HOY = "2026-06-15";

describe("clasificarSeguimiento", () => {
  it("una empresa cerrada nunca requiere seguimiento", () => {
    const ganada = crearEmpresa({
      estado: "Cerrada - Ganada",
      fechaProximoSeguimiento: "2026-01-01",
      requiereSeguimiento: true,
    });
    expect(clasificarSeguimiento(ganada, HOY)).toBe("ninguno");
  });

  it("fecha anterior a hoy => vencido", () => {
    const e = crearEmpresa({ fechaProximoSeguimiento: "2026-06-10" });
    expect(clasificarSeguimiento(e, HOY)).toBe("vencido");
  });

  it("fecha igual a hoy => hoy", () => {
    const e = crearEmpresa({ fechaProximoSeguimiento: HOY });
    expect(clasificarSeguimiento(e, HOY)).toBe("hoy");
  });

  it("fecha dentro de 7 días => proximos7", () => {
    const e = crearEmpresa({ fechaProximoSeguimiento: "2026-06-22" });
    expect(clasificarSeguimiento(e, HOY)).toBe("proximos7");
  });

  it("fecha más allá de 7 días => futuro", () => {
    const e = crearEmpresa({ fechaProximoSeguimiento: "2026-07-15" });
    expect(clasificarSeguimiento(e, HOY)).toBe("futuro");
  });

  it("sin fecha pero marcada => sinFecha", () => {
    const e = crearEmpresa({ requiereSeguimiento: true });
    expect(clasificarSeguimiento(e, HOY)).toBe("sinFecha");
  });

  it("sin fecha y sin marca => ninguno", () => {
    expect(clasificarSeguimiento(crearEmpresa(), HOY)).toBe("ninguno");
  });
});

describe("completar y reagendar", () => {
  it("al reagendar a una fecha futura deja de estar vencida", () => {
    const vencida = crearEmpresa({ fechaProximoSeguimiento: "2026-06-01" });
    expect(clasificarSeguimiento(vencida, HOY)).toBe("vencido");

    const reagendada = { ...vencida, fechaProximoSeguimiento: "2026-06-20" };
    expect(clasificarSeguimiento(reagendada, HOY)).toBe("proximos7");
    expect(requiereAtencion(reagendada, HOY)).toBe(true);
  });

  it("al completar sin nueva fecha y sin marca ya no requiere atención", () => {
    const cerradaSinFecha = crearEmpresa({
      fechaProximoSeguimiento: null,
      requiereSeguimiento: false,
    });
    expect(requiereAtencion(cerradaSinFecha, HOY)).toBe(false);
  });
});

describe("resumirSeguimientos", () => {
  it("cuenta cada bucket relevante", () => {
    const empresas = [
      crearEmpresa({ fechaProximoSeguimiento: "2026-06-01" }), // vencido
      crearEmpresa({ fechaProximoSeguimiento: "2026-06-10" }), // vencido
      crearEmpresa({ fechaProximoSeguimiento: HOY }), // hoy
      crearEmpresa({ fechaProximoSeguimiento: "2026-06-18" }), // proximos7
      crearEmpresa({ fechaProximoSeguimiento: "2026-08-01" }), // futuro (no cuenta)
      crearEmpresa({ requiereSeguimiento: true }), // sinFecha
      crearEmpresa(), // ninguno
      crearEmpresa({
        estado: "Cerrada - No concretada",
        fechaProximoSeguimiento: "2026-06-01",
      }), // cerrada => ninguno
    ];
    expect(resumirSeguimientos(empresas, HOY)).toEqual({
      vencido: 2,
      hoy: 1,
      proximos7: 1,
      sinFecha: 1,
    });
  });
});

describe("empresasParaSeguimiento", () => {
  it("excluye a las que no requieren atención y ordena por prioridad", () => {
    const conFecha = crearEmpresa({
      nombre: "Con fecha vencida",
      estado: "Pendiente",
      fechaProximoSeguimiento: "2026-06-01",
    });
    const marcada = crearEmpresa({
      nombre: "Solo marcada",
      estado: "En avance",
      requiereSeguimiento: true,
    });
    const irrelevante = crearEmpresa({ nombre: "Sin nada" });

    const lista = empresasParaSeguimiento(
      [irrelevante, marcada, conFecha],
      HOY,
    );

    expect(lista.map((e) => e.nombre)).toEqual([
      "Con fecha vencida", // grupo 1: tiene fecha
      "Solo marcada", // grupo 2: solo marca
    ]);
  });
});

describe("prioridadDeBucket", () => {
  it("asigna la etiqueta correcta", () => {
    expect(prioridadDeBucket("vencido")).toBe("Alta");
    expect(prioridadDeBucket("hoy")).toBe("Alta");
    expect(prioridadDeBucket("proximos7")).toBe("Media");
    expect(prioridadDeBucket("sinFecha")).toBe("Media");
    expect(prioridadDeBucket("futuro")).toBe("Baja");
    expect(prioridadDeBucket("ninguno")).toBe("—");
  });
});
