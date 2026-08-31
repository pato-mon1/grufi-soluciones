import type {
  Empresa,
  EstadoEmpresa,
  MovimientoFinanciero,
  Tarea,
} from "@/lib/types";

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

/** Fábrica de `Tarea` para las pruebas. */
export function crearTarea(overrides: Partial<Tarea> = {}): Tarea {
  const base: Tarea = {
    id: Math.random().toString(36).slice(2),
    empresaId: null,
    titulo: "Tarea de prueba",
    descripcion: "",
    estado: "pendiente",
    prioridad: "media",
    fechaLimite: null,
    fechaCompletada: null,
    orden: 0,
    responsable: "",
    fechaCreacion: "2026-01-01T00:00:00.000Z",
    fechaActualizacion: "2026-01-01T00:00:00.000Z",
  };
  return { ...base, ...overrides };
}

/** Fábrica de `MovimientoFinanciero` para las pruebas. */
export function crearMovimiento(
  overrides: Partial<MovimientoFinanciero> = {},
): MovimientoFinanciero {
  const base: MovimientoFinanciero = {
    id: Math.random().toString(36).slice(2),
    empresaId: null,
    categoriaId: null,
    tipo: "ingreso",
    concepto: "Movimiento de prueba",
    monto: 0,
    estado: "liquidado",
    fecha: "2026-01-01",
    fechaLiquidado: "2026-01-01",
    notas: "",
    fechaCreacion: "2026-01-01T00:00:00.000Z",
    fechaActualizacion: "2026-01-01T00:00:00.000Z",
  };
  return { ...base, ...overrides };
}
