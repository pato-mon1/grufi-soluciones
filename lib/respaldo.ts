import type {
  Actividad,
  AjustesApp,
  CategoriaFinanza,
  Contacto,
  Empresa,
  EventoCalendario,
  MovimientoFinanciero,
  Tarea,
} from "@/lib/types";

export const VERSION_RESPALDO = 2;

export interface Respaldo {
  version: number;
  generado: string;
  empresas: Empresa[];
  contactos: Contacto[];
  actividades: Actividad[];
  tareas: Tarea[];
  categorias: CategoriaFinanza[];
  movimientos: MovimientoFinanciero[];
  eventos: EventoCalendario[];
  ajustes: AjustesApp;
}

export function construirRespaldo(datos: Omit<Respaldo, "version" | "generado">): Respaldo {
  return {
    version: VERSION_RESPALDO,
    generado: new Date().toISOString(),
    ...datos,
  };
}

export function nombreArchivoRespaldo(fecha = new Date()): string {
  const iso = fecha.toISOString().slice(0, 10);
  return `respaldo-grufi-${iso}.json`;
}

export interface ResumenRespaldo {
  empresas: number;
  contactos: number;
  actividades: number;
  tareas: number;
  categorias: number;
  movimientos: number;
  eventos: number;
}

/**
 * Valida la forma de un objeto arbitrario como respaldo y devuelve un
 * resumen con los conteos, o `null` si no es un respaldo reconocible.
 */
export function inspeccionarRespaldo(valor: unknown): ResumenRespaldo | null {
  if (typeof valor !== "object" || valor === null) return null;
  const r = valor as Record<string, unknown>;
  const listas = [
    "empresas",
    "contactos",
    "actividades",
    "tareas",
    "categorias",
    "movimientos",
    "eventos",
  ] as const;
  if (!listas.every((clave) => Array.isArray(r[clave] ?? []))) return null;
  if (
    r.empresas === undefined &&
    r.tareas === undefined &&
    r.movimientos === undefined
  ) {
    return null;
  }
  const contar = (clave: string) =>
    Array.isArray(r[clave]) ? (r[clave] as unknown[]).length : 0;
  return {
    empresas: contar("empresas"),
    contactos: contar("contactos"),
    actividades: contar("actividades"),
    tareas: contar("tareas"),
    categorias: contar("categorias"),
    movimientos: contar("movimientos"),
    eventos: contar("eventos"),
  };
}
