import { describe, expect, it } from "vitest";
import {
  construirItems,
  desdeIso,
  desplazarDia,
  desplazarMes,
  diasDelMes,
  diasDeSemana,
  isoLocal,
  itemsPorDia,
} from "@/lib/calendario";
import { crearEmpresa, crearMovimiento, crearTarea } from "@/lib/test-helpers";
import type { EventoCalendario } from "@/lib/types";

describe("isoLocal / desdeIso", () => {
  it("ida y vuelta sin desfase de zona horaria", () => {
    const iso = "2026-06-15";
    expect(isoLocal(desdeIso(iso))).toBe(iso);
  });
});

describe("diasDelMes", () => {
  it("devuelve 42 celdas que empiezan en lunes", () => {
    const celdas = diasDelMes(2026, 5, "2026-06-15"); // junio 2026
    expect(celdas).toHaveLength(42);
    // 1 de junio de 2026 es lunes -> la primera celda es el 1
    expect(celdas[0].iso).toBe("2026-06-01");
    expect(celdas[0].enMes).toBe(true);
    expect(desdeIso(celdas[0].iso).getDay()).toBe(1); // lunes
  });

  it("marca los días fuera del mes y el día de hoy", () => {
    const celdas = diasDelMes(2026, 0, "2026-01-10"); // enero 2026 empieza en jueves
    expect(celdas[0].iso).toBe("2025-12-29");
    expect(celdas[0].enMes).toBe(false);
    const hoy = celdas.find((c) => c.iso === "2026-01-10");
    expect(hoy?.esHoy).toBe(true);
  });
});

describe("diasDeSemana", () => {
  it("devuelve 7 días de lunes a domingo", () => {
    const dias = diasDeSemana("2026-06-17"); // miércoles
    expect(dias).toHaveLength(7);
    expect(dias[0].iso).toBe("2026-06-15"); // lunes
    expect(dias[6].iso).toBe("2026-06-21"); // domingo
  });
});

describe("desplazarMes", () => {
  it("avanza y retrocede con acarreo de año", () => {
    expect(desplazarMes(2026, 11, 1)).toEqual({ anio: 2027, mes: 0 });
    expect(desplazarMes(2026, 0, -1)).toEqual({ anio: 2025, mes: 11 });
    expect(desplazarMes(2026, 5, 3)).toEqual({ anio: 2026, mes: 8 });
  });
});

describe("desplazarDia", () => {
  it("cruza fin de mes correctamente", () => {
    expect(desplazarDia("2026-01-31", 1)).toBe("2026-02-01");
    expect(desplazarDia("2026-03-01", -1)).toBe("2026-02-28");
  });
});

describe("construirItems", () => {
  const evento: EventoCalendario = {
    id: "ev1",
    empresaId: null,
    titulo: "Junta general",
    descripcion: "",
    inicio: "2026-06-18T09:30:00.000Z",
    fin: null,
    todoElDia: false,
    tipo: "reunion",
    fechaCreacion: "",
    fechaActualizacion: "",
  };

  it("reúne seguimientos, tareas, cobros/pagos pendientes y eventos", () => {
    const items = construirItems({
      empresas: [
        crearEmpresa({
          id: "e1",
          nombre: "Alfa",
          fechaProximoSeguimiento: "2026-06-16",
        }),
        crearEmpresa({
          id: "e2",
          nombre: "Cerrada",
          estado: "Cerrada - Ganada",
          fechaProximoSeguimiento: "2026-06-16",
        }),
      ],
      tareas: [
        crearTarea({ id: "t1", titulo: "Cotizar", fechaLimite: "2026-06-17" }),
        crearTarea({
          id: "t2",
          titulo: "Hecha",
          estado: "hecha",
          fechaLimite: "2026-06-17",
        }),
        crearTarea({ id: "t3", titulo: "Sin fecha" }),
      ],
      movimientos: [
        crearMovimiento({
          id: "m1",
          tipo: "ingreso",
          estado: "pendiente",
          concepto: "Anticipo",
          fecha: "2026-06-19",
        }),
        crearMovimiento({
          id: "m2",
          tipo: "egreso",
          estado: "liquidado",
          concepto: "Pagado ya",
          fecha: "2026-06-19",
        }),
      ],
      eventos: [evento],
    });

    const tipos = items.map((i) => i.tipo).sort();
    expect(tipos).toEqual(["cobro", "evento", "seguimiento", "tarea"]);

    const seguimiento = items.find((i) => i.tipo === "seguimiento");
    expect(seguimiento?.titulo).toBe("Alfa");
    expect(seguimiento?.fecha).toBe("2026-06-16");

    const ev = items.find((i) => i.tipo === "evento");
    expect(ev?.fecha).toBe("2026-06-18");
    expect(ev?.hora).toBe("09:30");
  });
});

describe("itemsPorDia", () => {
  it("agrupa por fecha y ordena por hora (sin hora al final)", () => {
    const mapa = itemsPorDia([
      { id: "a", origenId: "a", tipo: "evento", fecha: "2026-06-18", hora: "15:00", titulo: "Tarde" },
      { id: "b", origenId: "b", tipo: "evento", fecha: "2026-06-18", hora: "09:00", titulo: "Mañana" },
      { id: "c", origenId: "c", tipo: "tarea", fecha: "2026-06-18", hora: null, titulo: "Sin hora" },
      { id: "d", origenId: "d", tipo: "tarea", fecha: "2026-06-19", hora: null, titulo: "Otro día" },
    ]);
    expect(mapa["2026-06-18"].map((i) => i.titulo)).toEqual([
      "Mañana",
      "Tarde",
      "Sin hora",
    ]);
    expect(mapa["2026-06-19"]).toHaveLength(1);
  });
});
