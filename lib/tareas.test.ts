import { describe, expect, it } from "vitest";
import {
  agruparPorEstado,
  resumirTareas,
  siguienteOrden,
  tareaParaHoy,
  tareaVencida,
} from "@/lib/tareas";
import { crearTarea } from "@/lib/test-helpers";

const HOY = "2026-06-15";

describe("agruparPorEstado", () => {
  it("reparte las tareas en las 4 columnas y las ordena por 'orden'", () => {
    const grupos = agruparPorEstado([
      crearTarea({ estado: "pendiente", orden: 2, titulo: "B" }),
      crearTarea({ estado: "pendiente", orden: 1, titulo: "A" }),
      crearTarea({ estado: "hecha", orden: 0, titulo: "C" }),
    ]);
    expect(grupos.pendiente.map((t) => t.titulo)).toEqual(["A", "B"]);
    expect(grupos.hecha.map((t) => t.titulo)).toEqual(["C"]);
    expect(grupos.en_progreso).toEqual([]);
    expect(grupos.en_espera).toEqual([]);
  });
});

describe("tareaVencida", () => {
  it("es true si la fecha límite ya pasó y no está hecha", () => {
    expect(
      tareaVencida(crearTarea({ fechaLimite: "2026-06-10" }), HOY),
    ).toBe(true);
  });

  it("es false si está hecha aunque la fecha haya pasado", () => {
    expect(
      tareaVencida(
        crearTarea({ estado: "hecha", fechaLimite: "2026-06-10" }),
        HOY,
      ),
    ).toBe(false);
  });

  it("es false sin fecha límite o con fecha futura", () => {
    expect(tareaVencida(crearTarea(), HOY)).toBe(false);
    expect(
      tareaVencida(crearTarea({ fechaLimite: "2026-07-01" }), HOY),
    ).toBe(false);
  });
});

describe("tareaParaHoy", () => {
  it("es true solo si la fecha límite es hoy y no está hecha", () => {
    expect(tareaParaHoy(crearTarea({ fechaLimite: HOY }), HOY)).toBe(true);
    expect(
      tareaParaHoy(crearTarea({ estado: "hecha", fechaLimite: HOY }), HOY),
    ).toBe(false);
  });
});

describe("resumirTareas", () => {
  it("cuenta por estado y las vencidas", () => {
    const r = resumirTareas(
      [
        crearTarea({ estado: "pendiente" }),
        crearTarea({ estado: "en_espera" }),
        crearTarea({ estado: "en_progreso" }),
        crearTarea({ estado: "hecha" }),
        crearTarea({ estado: "pendiente", fechaLimite: "2026-06-01" }),
      ],
      HOY,
    );
    expect(r).toEqual({
      total: 5,
      pendientes: 3, // pendiente + en_espera + pendiente vencida
      enProgreso: 1,
      hechas: 1,
      vencidas: 1,
    });
  });
});

describe("siguienteOrden", () => {
  it("es 0 en una columna vacía", () => {
    expect(siguienteOrden([], "pendiente")).toBe(0);
  });

  it("es el máximo de la columna + 1", () => {
    const tareas = [
      crearTarea({ estado: "pendiente", orden: 0 }),
      crearTarea({ estado: "pendiente", orden: 4 }),
      crearTarea({ estado: "hecha", orden: 9 }),
    ];
    expect(siguienteOrden(tareas, "pendiente")).toBe(5);
    expect(siguienteOrden(tareas, "en_progreso")).toBe(0);
  });
});
