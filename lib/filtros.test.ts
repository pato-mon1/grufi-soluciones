import { describe, expect, it } from "vitest";
import {
  calcularResumen,
  filtrarYOrdenar,
  grupoSeguimiento,
  type OpcionesFiltro,
} from "@/lib/filtros";
import { crearEmpresa } from "@/lib/test-helpers";
import { hoyISO } from "@/lib/date";

const BASE: OpcionesFiltro = {
  busqueda: "",
  estado: "todos",
  soloPendientes: false,
  soloMarcadas: false,
  orden: "prioridad",
  direccion: "asc",
};

const AYER = (() => {
  const d = new Date(`${hoyISO()}T00:00:00`);
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
})();

const MANANA = (() => {
  const d = new Date(`${hoyISO()}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
})();

describe("grupoSeguimiento", () => {
  it("prioriza fecha > marca > resto", () => {
    expect(
      grupoSeguimiento(crearEmpresa({ fechaProximoSeguimiento: MANANA })),
    ).toBe(1);
    expect(grupoSeguimiento(crearEmpresa({ requiereSeguimiento: true }))).toBe(2);
    expect(grupoSeguimiento(crearEmpresa())).toBe(3);
  });
});

describe("filtrarYOrdenar — orden por prioridad", () => {
  it("agrupa por señal de seguimiento y luego por estado", () => {
    const empresas = [
      crearEmpresa({ nombre: "Z sin nada", estado: "Pendiente" }),
      crearEmpresa({
        nombre: "Marcada en avance",
        estado: "En avance",
        requiereSeguimiento: true,
      }),
      crearEmpresa({
        nombre: "Con fecha pendiente",
        estado: "Pendiente",
        fechaProximoSeguimiento: MANANA,
      }),
      crearEmpresa({
        nombre: "Con fecha en avance",
        estado: "En avance",
        fechaProximoSeguimiento: MANANA,
      }),
    ];
    const orden = filtrarYOrdenar(empresas, BASE).map((e) => e.nombre);
    expect(orden).toEqual([
      "Con fecha en avance", // grupo 1, estado "En avance" (rango 1)
      "Con fecha pendiente", // grupo 1, estado "Pendiente" (rango 3)
      "Marcada en avance", // grupo 2
      "Z sin nada", // grupo 3
    ]);
  });
});

describe("filtrarYOrdenar — filtros principales", () => {
  const empresas = [
    crearEmpresa({ nombre: "Alfa", estado: "Pendiente" }),
    crearEmpresa({
      nombre: "Beta",
      estado: "En avance",
      requiereSeguimiento: true,
    }),
    crearEmpresa({
      nombre: "Gamma",
      estado: "Pendiente",
      fechaProximoSeguimiento: AYER, // seguimiento vencido
    }),
    crearEmpresa({
      nombre: "Delta",
      estado: "Cerrada - Ganada",
      fechaProximoSeguimiento: AYER, // cerrada: no cuenta como pendiente
    }),
  ];

  it("filtra por texto de búsqueda", () => {
    const r = filtrarYOrdenar(empresas, { ...BASE, busqueda: "gam" });
    expect(r.map((e) => e.nombre)).toEqual(["Gamma"]);
  });

  it("filtra por estado", () => {
    const r = filtrarYOrdenar(empresas, { ...BASE, estado: "Pendiente" });
    expect(r.map((e) => e.nombre).sort()).toEqual(["Alfa", "Gamma"]);
  });

  it("soloMarcadas deja solo las que tienen la marca manual", () => {
    const r = filtrarYOrdenar(empresas, { ...BASE, soloMarcadas: true });
    expect(r.map((e) => e.nombre)).toEqual(["Beta"]);
  });

  it("soloPendientes deja solo seguimientos vencidos/hoy no cerrados", () => {
    const r = filtrarYOrdenar(empresas, { ...BASE, soloPendientes: true });
    expect(r.map((e) => e.nombre)).toEqual(["Gamma"]);
  });

  it("invierte el orden con direccion desc", () => {
    const asc = filtrarYOrdenar(empresas, { ...BASE, orden: "nombre" });
    const desc = filtrarYOrdenar(empresas, {
      ...BASE,
      orden: "nombre",
      direccion: "desc",
    });
    expect(desc.map((e) => e.nombre)).toEqual(
      [...asc.map((e) => e.nombre)].reverse(),
    );
  });
});

describe("calcularResumen", () => {
  it("totaliza por estado y señales de seguimiento", () => {
    const resumen = calcularResumen([
      crearEmpresa({ estado: "Pendiente", requiereSeguimiento: true }),
      crearEmpresa({ estado: "Pendiente", fechaProximoSeguimiento: AYER }),
      crearEmpresa({ estado: "En avance" }),
    ]);
    expect(resumen.total).toBe(3);
    expect(resumen.porEstado["Pendiente"]).toBe(2);
    expect(resumen.marcadasSeguimiento).toBe(1);
    expect(resumen.seguimientoPendiente).toBe(1);
  });
});
