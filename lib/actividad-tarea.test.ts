import { describe, expect, it } from "vitest";
import { describirActividad } from "@/lib/actividad-tarea";
import type { ActividadTarea } from "@/lib/types";

const NOMBRES: Record<string, string> = {
  u1: "Patricio",
  u2: "Cano",
};
const nombre = (id: string | null | undefined) =>
  (id && NOMBRES[id]) || "Alguien";

function act(p: Partial<ActividadTarea>): ActividadTarea {
  return {
    id: "a",
    tareaId: "t",
    actorId: "u1",
    accion: "crear",
    valoresPrevios: null,
    valoresNuevos: null,
    fechaCreacion: "2026-09-01T10:00:00.000Z",
    ...p,
  };
}

describe("describirActividad", () => {
  it("creación", () => {
    expect(describirActividad(act({ accion: "crear" }), nombre)).toBe(
      "Patricio creó la tarea",
    );
  });

  it("asignación desde vacío", () => {
    expect(
      describirActividad(
        act({
          accion: "reasignar",
          valoresPrevios: { asignado_a: null },
          valoresNuevos: { asignado_a: "u2" },
        }),
        nombre,
      ),
    ).toBe("Patricio asignó la tarea a Cano");
  });

  it("reasignación entre personas", () => {
    expect(
      describirActividad(
        act({
          accion: "reasignar",
          valoresPrevios: { asignado_a: "u1" },
          valoresNuevos: { asignado_a: "u2" },
        }),
        nombre,
      ),
    ).toBe("Patricio reasignó la tarea de Patricio a Cano");
  });

  it("cambio de estado con etiquetas legibles", () => {
    expect(
      describirActividad(
        act({
          actorId: "u2",
          accion: "estado",
          valoresPrevios: { estado: "por_hacer" },
          valoresNuevos: { estado: "en_curso" },
        }),
        nombre,
      ),
    ).toBe("Cano cambió el estado de Por hacer a En curso");
  });

  it("completar y reabrir", () => {
    expect(
      describirActividad(act({ actorId: "u2", accion: "completar" }), nombre),
    ).toBe("Cano marcó la tarea como completada");
    expect(
      describirActividad(act({ accion: "reabrir" }), nombre),
    ).toBe("Patricio reabrió la tarea");
  });

  it("cambio de fecha límite", () => {
    const s = describirActividad(
      act({
        accion: "fecha",
        valoresPrevios: { vence_en: "2026-09-05T18:00:00.000Z" },
        valoresNuevos: { vence_en: "2026-09-07T18:00:00.000Z" },
      }),
      nombre,
    );
    expect(s).toContain("cambió la fecha límite");
    expect(s).toContain("sep");
  });

  it("prioridad y comentario", () => {
    expect(
      describirActividad(
        act({
          accion: "prioridad",
          valoresPrevios: { prioridad: "media" },
          valoresNuevos: { prioridad: "alta" },
        }),
        nombre,
      ),
    ).toBe("Patricio cambió la prioridad de Media a Alta");
    expect(
      describirActividad(act({ actorId: "u2", accion: "comentario" }), nombre),
    ).toBe("Cano agregó un comentario");
  });
});
