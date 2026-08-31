import { hoyISO } from "@/lib/date";
import type { EstadoTarea, PrioridadTarea, Tarea } from "@/lib/types";

/** Columnas del tablero Kanban, en orden. */
export const COLUMNAS_TAREA: { estado: EstadoTarea; etiqueta: string }[] = [
  { estado: "pendiente", etiqueta: "Pendiente" },
  { estado: "en_progreso", etiqueta: "En progreso" },
  { estado: "en_espera", etiqueta: "En espera" },
  { estado: "hecha", etiqueta: "Hecha" },
];

export const ETIQUETA_PRIORIDAD: Record<PrioridadTarea, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

/** Orden de una tarea dentro de su columna (menor primero, luego más recientes). */
function compararTareas(a: Tarea, b: Tarea): number {
  if (a.orden !== b.orden) return a.orden - b.orden;
  return b.fechaCreacion.localeCompare(a.fechaCreacion);
}

/** Agrupa las tareas por estado, cada grupo ya ordenado para el tablero. */
export function agruparPorEstado(
  tareas: Tarea[],
): Record<EstadoTarea, Tarea[]> {
  const grupos: Record<EstadoTarea, Tarea[]> = {
    pendiente: [],
    en_progreso: [],
    en_espera: [],
    hecha: [],
  };
  for (const t of tareas) grupos[t.estado].push(t);
  for (const estado of Object.keys(grupos) as EstadoTarea[]) {
    grupos[estado].sort(compararTareas);
  }
  return grupos;
}

/** Una tarea está vencida si tiene fecha límite pasada y no está hecha. */
export function tareaVencida(tarea: Tarea, hoy: string = hoyISO()): boolean {
  if (tarea.estado === "hecha" || !tarea.fechaLimite) return false;
  return tarea.fechaLimite < hoy;
}

/** Una tarea vence hoy si su fecha límite es hoy y no está hecha. */
export function tareaParaHoy(tarea: Tarea, hoy: string = hoyISO()): boolean {
  return tarea.estado !== "hecha" && tarea.fechaLimite === hoy;
}

export interface ResumenTareas {
  total: number;
  pendientes: number;
  enProgreso: number;
  hechas: number;
  vencidas: number;
}

export function resumirTareas(
  tareas: Tarea[],
  hoy: string = hoyISO(),
): ResumenTareas {
  const r: ResumenTareas = {
    total: tareas.length,
    pendientes: 0,
    enProgreso: 0,
    hechas: 0,
    vencidas: 0,
  };
  for (const t of tareas) {
    if (t.estado === "pendiente" || t.estado === "en_espera") r.pendientes += 1;
    if (t.estado === "en_progreso") r.enProgreso += 1;
    if (t.estado === "hecha") r.hechas += 1;
    if (tareaVencida(t, hoy)) r.vencidas += 1;
  }
  return r;
}

/** Siguiente valor de `orden` para agregar una tarea al final de una columna. */
export function siguienteOrden(
  tareas: Tarea[],
  estado: EstadoTarea,
): number {
  const enColumna = tareas.filter((t) => t.estado === estado);
  if (enColumna.length === 0) return 0;
  return Math.max(...enColumna.map((t) => t.orden)) + 1;
}
