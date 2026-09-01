import { describe, expect, it } from "vitest";
import {
  agruparPorEstado,
  completadaEstaSemana,
  debeRecordar,
  puedeAvanzarTarea,
  puedeEditarTarea,
  puedeEliminarTarea,
  resumirTareas,
  siguienteOrden,
  tareaParaHoy,
  tareaVencida,
} from "@/lib/tareas";
import { crearTarea } from "@/lib/test-helpers";

const AHORA = new Date("2026-06-15T12:00:00.000Z");
const HOY = "2026-06-15";

describe("agruparPorEstado", () => {
  it("reparte las tareas en las 4 columnas y las ordena por 'orden'", () => {
    const grupos = agruparPorEstado([
      crearTarea({ estado: "por_hacer", orden: 2, titulo: "B" }),
      crearTarea({ estado: "por_hacer", orden: 1, titulo: "A" }),
      crearTarea({ estado: "completada", orden: 0, titulo: "C" }),
    ]);
    expect(grupos.por_hacer.map((t) => t.titulo)).toEqual(["A", "B"]);
    expect(grupos.completada.map((t) => t.titulo)).toEqual(["C"]);
    expect(grupos.en_curso).toEqual([]);
    expect(grupos.en_revision).toEqual([]);
  });
});

describe("tareaVencida", () => {
  it("es true si el vencimiento ya pasó y no está completada", () => {
    expect(
      tareaVencida(crearTarea({ venceEn: "2026-06-10T09:00:00.000Z" }), AHORA),
    ).toBe(true);
  });

  it("es false si está completada aunque la fecha haya pasado", () => {
    expect(
      tareaVencida(
        crearTarea({ estado: "completada", venceEn: "2026-06-10T09:00:00.000Z" }),
        AHORA,
      ),
    ).toBe(false);
  });

  it("es false sin fecha o con fecha futura", () => {
    expect(tareaVencida(crearTarea(), AHORA)).toBe(false);
    expect(
      tareaVencida(crearTarea({ venceEn: "2026-07-01T09:00:00.000Z" }), AHORA),
    ).toBe(false);
  });

  it("usa fechaLimite si no hay venceEn (fin del día)", () => {
    expect(
      tareaVencida(crearTarea({ fechaLimite: "2026-06-15" }), AHORA),
    ).toBe(false); // vence a las 23:59, aún no pasa a mediodía
    expect(
      tareaVencida(crearTarea({ fechaLimite: "2026-06-14" }), AHORA),
    ).toBe(true);
  });
});

describe("tareaParaHoy", () => {
  it("es true solo si la fecha límite es hoy y no está completada", () => {
    expect(tareaParaHoy(crearTarea({ fechaLimite: HOY }), HOY)).toBe(true);
    expect(
      tareaParaHoy(crearTarea({ estado: "completada", fechaLimite: HOY }), HOY),
    ).toBe(false);
  });
});

describe("completadaEstaSemana", () => {
  it("cuenta solo las completadas en los últimos 7 días", () => {
    expect(
      completadaEstaSemana(
        crearTarea({
          estado: "completada",
          fechaCompletada: "2026-06-12T10:00:00.000Z",
        }),
        AHORA,
      ),
    ).toBe(true);
    expect(
      completadaEstaSemana(
        crearTarea({
          estado: "completada",
          fechaCompletada: "2026-06-01T10:00:00.000Z",
        }),
        AHORA,
      ),
    ).toBe(false);
  });
});

describe("resumirTareas", () => {
  it("cuenta por estado, pendientes y vencidas", () => {
    const r = resumirTareas(
      [
        crearTarea({ estado: "por_hacer" }),
        crearTarea({ estado: "en_revision" }),
        crearTarea({ estado: "en_curso" }),
        crearTarea({ estado: "completada" }),
        crearTarea({ estado: "por_hacer", venceEn: "2026-06-01T09:00:00.000Z" }),
      ],
      AHORA,
    );
    expect(r.total).toBe(5);
    expect(r.porHacer).toBe(2);
    expect(r.enCurso).toBe(1);
    expect(r.enRevision).toBe(1);
    expect(r.completadas).toBe(1);
    expect(r.pendientes).toBe(4);
    expect(r.vencidas).toBe(1);
  });
});

describe("permisos", () => {
  const tarea = crearTarea({ creadoPor: "creador", asignadoA: "resp" });

  it("el responsable puede avanzar pero no editar todo", () => {
    expect(puedeAvanzarTarea(tarea, "resp", false)).toBe(true);
    expect(puedeEditarTarea(tarea, "resp", false)).toBe(false);
  });

  it("el creador puede editar y eliminar", () => {
    expect(puedeEditarTarea(tarea, "creador", false)).toBe(true);
    expect(puedeEliminarTarea(tarea, "creador", false)).toBe(true);
  });

  it("un admin puede todo", () => {
    expect(puedeEditarTarea(tarea, "otro", true)).toBe(true);
    expect(puedeAvanzarTarea(tarea, "otro", true)).toBe(true);
  });

  it("un usuario sin relación no puede editar ni eliminar", () => {
    expect(puedeEditarTarea(tarea, "extraño", false)).toBe(false);
    expect(puedeEliminarTarea(tarea, "extraño", false)).toBe(false);
    expect(puedeAvanzarTarea(tarea, "extraño", false)).toBe(false);
  });

  it("sin sesión no puede nada", () => {
    expect(puedeEditarTarea(tarea, null, false)).toBe(false);
    expect(puedeAvanzarTarea(tarea, undefined, true)).toBe(false);
  });
});

describe("debeRecordar", () => {
  const AHORA = new Date("2026-09-05T12:00:00.000Z");

  it("permite el recordatorio si no hay uno reciente del mismo tipo", () => {
    expect(debeRecordar([], "t1", "vence_pronto", AHORA)).toBe(true);
    expect(
      debeRecordar(
        [
          {
            tipo: "vencida",
            tareaId: "t1",
            fechaCreacion: "2026-09-05T11:00:00.000Z",
          },
        ],
        "t1",
        "vence_pronto",
        AHORA,
      ),
    ).toBe(true);
  });

  it("lo bloquea si ya hay uno dentro de la ventana", () => {
    expect(
      debeRecordar(
        [
          {
            tipo: "vence_pronto",
            tareaId: "t1",
            fechaCreacion: "2026-09-05T01:00:00.000Z",
          },
        ],
        "t1",
        "vence_pronto",
        AHORA,
      ),
    ).toBe(false);
  });

  it("permite de nuevo si el anterior quedó fuera de la ventana", () => {
    expect(
      debeRecordar(
        [
          {
            tipo: "vence_pronto",
            tareaId: "t1",
            fechaCreacion: "2026-09-03T12:00:00.000Z",
          },
        ],
        "t1",
        "vence_pronto",
        AHORA,
      ),
    ).toBe(true);
  });
});

describe("siguienteOrden", () => {
  it("es 0 en una columna vacía", () => {
    expect(siguienteOrden([], "por_hacer")).toBe(0);
  });

  it("es el máximo de la columna + 1", () => {
    const tareas = [
      crearTarea({ estado: "por_hacer", orden: 0 }),
      crearTarea({ estado: "por_hacer", orden: 4 }),
      crearTarea({ estado: "completada", orden: 9 }),
    ];
    expect(siguienteOrden(tareas, "por_hacer")).toBe(5);
    expect(siguienteOrden(tareas, "en_curso")).toBe(0);
  });
});
