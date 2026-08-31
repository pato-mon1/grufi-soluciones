import type { Empresa, EstadoEmpresa } from "@/lib/types";

/**
 * Fábrica de `Empresa` para las pruebas. Valores por defecto razonables;
 * se sobreescriben con `overrides`.
 */
export function crearEmpresa(overrides: Partial<Empresa> = {}): Empresa {
  const base: Empresa = {
    id: Math.random().toString(36).slice(2),
    nombre: "Empresa de prueba",
    estado: "Pendiente" as EstadoEmpresa,
    montoResultado: null,
    notas: "",
    fechaUltimoContacto: null,
    fechaProximoSeguimiento: null,
    requiereSeguimiento: false,
    fechaCreacion: "2026-01-01T00:00:00.000Z",
    fechaActualizacion: "2026-01-01T00:00:00.000Z",
  };
  return { ...base, ...overrides };
}
