import { describe, expect, it } from "vitest";
import {
  construirRespaldo,
  inspeccionarRespaldo,
  nombreArchivoRespaldo,
  VERSION_RESPALDO,
} from "@/lib/respaldo";
import { AJUSTES_PREDETERMINADOS } from "@/lib/types";
import { crearEmpresa } from "@/lib/test-helpers";

const VACIO = {
  empresas: [],
  contactos: [],
  actividades: [],
  tareas: [],
  categorias: [],
  movimientos: [],
  eventos: [],
  ajustes: AJUSTES_PREDETERMINADOS,
};

describe("construirRespaldo", () => {
  it("agrega versión y marca de tiempo", () => {
    const r = construirRespaldo({ ...VACIO, empresas: [crearEmpresa()] });
    expect(r.version).toBe(VERSION_RESPALDO);
    expect(r.generado).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(r.empresas).toHaveLength(1);
  });
});

describe("nombreArchivoRespaldo", () => {
  it("usa la fecha en el nombre", () => {
    expect(nombreArchivoRespaldo(new Date("2026-03-04T10:00:00Z"))).toBe(
      "respaldo-grufi-2026-03-04.json",
    );
  });
});

describe("inspeccionarRespaldo", () => {
  it("devuelve los conteos de un respaldo válido", () => {
    const r = construirRespaldo({
      ...VACIO,
      empresas: [crearEmpresa(), crearEmpresa()],
    });
    expect(inspeccionarRespaldo(r)).toEqual({
      empresas: 2,
      contactos: 0,
      actividades: 0,
      tareas: 0,
      categorias: 0,
      movimientos: 0,
      eventos: 0,
    });
  });

  it("rechaza objetos que no son respaldos", () => {
    expect(inspeccionarRespaldo(null)).toBeNull();
    expect(inspeccionarRespaldo("texto")).toBeNull();
    expect(inspeccionarRespaldo({ cualquiera: 1 })).toBeNull();
    expect(inspeccionarRespaldo({ empresas: "no-es-arreglo" })).toBeNull();
  });
});
