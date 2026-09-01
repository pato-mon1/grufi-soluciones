import { hoyISO } from "@/lib/date";
import {
  ETIQUETA_ESTADO_TAREA,
  type EstadoTarea,
  type PrioridadTarea,
  type Tarea,
} from "@/lib/types";

/** Columnas del tablero Kanban, en orden. */
export const COLUMNAS_TAREA: { estado: EstadoTarea; etiqueta: string }[] = [
  { estado: "por_hacer", etiqueta: ETIQUETA_ESTADO_TAREA.por_hacer },
  { estado: "en_curso", etiqueta: ETIQUETA_ESTADO_TAREA.en_curso },
  { estado: "en_revision", etiqueta: ETIQUETA_ESTADO_TAREA.en_revision },
  { estado: "completada", etiqueta: ETIQUETA_ESTADO_TAREA.completada },
];

export const ETIQUETA_PRIORIDAD: Record<PrioridadTarea, string> = {
  alta: "Alta",
  media: "Media",
  baja: "Baja",
};

/** Momento de vencimiento (ISO) de una tarea: `venceEn` o la fecha límite. */
export function vencimientoISO(tarea: Tarea): string | null {
  if (tarea.venceEn) return tarea.venceEn;
  if (tarea.fechaLimite) return `${tarea.fechaLimite}T23:59:59`;
  return null;
}

function compararTareas(a: Tarea, b: Tarea): number {
  if (a.orden !== b.orden) return a.orden - b.orden;
  return b.fechaCreacion.localeCompare(a.fechaCreacion);
}

/** Agrupa las tareas por estado, cada grupo ya ordenado para el tablero. */
export function agruparPorEstado(
  tareas: Tarea[],
): Record<EstadoTarea, Tarea[]> {
  const grupos: Record<EstadoTarea, Tarea[]> = {
    por_hacer: [],
    en_curso: [],
    en_revision: [],
    completada: [],
  };
  for (const t of tareas) grupos[t.estado].push(t);
  for (const estado of Object.keys(grupos) as EstadoTarea[]) {
    grupos[estado].sort(compararTareas);
  }
  return grupos;
}

/** Una tarea está vencida si su vencimiento ya pasó y no está completada. */
export function tareaVencida(tarea: Tarea, ahora: Date = new Date()): boolean {
  if (tarea.estado === "completada") return false;
  const v = vencimientoISO(tarea);
  if (!v) return false;
  return new Date(v).getTime() < ahora.getTime();
}

/** Una tarea vence hoy si su fecha límite es hoy y no está completada. */
export function tareaParaHoy(tarea: Tarea, hoy: string = hoyISO()): boolean {
  return tarea.estado !== "completada" && tarea.fechaLimite === hoy;
}

/** ¿La tarea se completó dentro de los últimos 7 días? */
export function completadaEstaSemana(
  tarea: Tarea,
  ahora: Date = new Date(),
): boolean {
  if (tarea.estado !== "completada" || !tarea.fechaCompletada) return false;
  const diff = ahora.getTime() - new Date(tarea.fechaCompletada).getTime();
  return diff >= 0 && diff <= 7 * 86_400_000;
}

export interface ResumenTareas {
  total: number;
  porHacer: number;
  enCurso: number;
  enRevision: number;
  completadas: number;
  pendientes: number;
  vencidas: number;
  paraHoy: number;
  completadasSemana: number;
}

export function resumirTareas(
  tareas: Tarea[],
  ahora: Date = new Date(),
): ResumenTareas {
  const hoy = ahora.toISOString().slice(0, 10);
  const r: ResumenTareas = {
    total: tareas.length,
    porHacer: 0,
    enCurso: 0,
    enRevision: 0,
    completadas: 0,
    pendientes: 0,
    vencidas: 0,
    paraHoy: 0,
    completadasSemana: 0,
  };
  for (const t of tareas) {
    if (t.estado === "por_hacer") r.porHacer += 1;
    if (t.estado === "en_curso") r.enCurso += 1;
    if (t.estado === "en_revision") r.enRevision += 1;
    if (t.estado === "completada") r.completadas += 1;
    if (t.estado !== "completada") r.pendientes += 1;
    if (tareaVencida(t, ahora)) r.vencidas += 1;
    if (tareaParaHoy(t, hoy)) r.paraHoy += 1;
    if (completadaEstaSemana(t, ahora)) r.completadasSemana += 1;
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

// ────────────────────────────────────────────────────────────
// Permisos (espejo de las políticas RLS; la BD es la barrera real)
// ────────────────────────────────────────────────────────────

/** El responsable o el creador/admin pueden avanzar y cambiar el estado. */
export function puedeAvanzarTarea(
  tarea: Pick<Tarea, "asignadoA" | "creadoPor">,
  userId: string | null | undefined,
  esAdmin: boolean,
): boolean {
  if (!userId) return false;
  if (esAdmin) return true;
  if (tarea.asignadoA === userId) return true;
  return tarea.creadoPor === userId;
}

/** El creador o un admin pueden editar todo, reasignar, fechas y prioridad. */
export function puedeEditarTarea(
  tarea: Pick<Tarea, "creadoPor">,
  userId: string | null | undefined,
  esAdmin: boolean,
): boolean {
  if (!userId) return false;
  if (esAdmin) return true;
  return tarea.creadoPor === userId;
}

/** Solo el creador o un admin pueden eliminar. */
export const puedeEliminarTarea = puedeEditarTarea;

// ────────────────────────────────────────────────────────────
// Recordatorios (evitar duplicados)
// ────────────────────────────────────────────────────────────

interface NotifMinima {
  tipo: string;
  tareaId: string | null;
  fechaCreacion: string;
}

/**
 * ¿Debe generarse un recordatorio de `tipo` para `tareaId`?
 * `false` si ya existe uno del mismo tipo para esa tarea dentro de
 * `ventanaHoras` (por defecto 20 h). Evita duplicados entre ejecuciones.
 */
export function debeRecordar(
  existentes: NotifMinima[],
  tareaId: string,
  tipo: string,
  ahora: Date = new Date(),
  ventanaHoras = 20,
): boolean {
  const limite = ahora.getTime() - ventanaHoras * 3_600_000;
  return !existentes.some(
    (n) =>
      n.tareaId === tareaId &&
      n.tipo === tipo &&
      new Date(n.fechaCreacion).getTime() >= limite,
  );
}

/** Avance implícito según el estado (para mostrar cuando progreso = 0). */
export function progresoDeEstado(estado: EstadoTarea): number {
  switch (estado) {
    case "por_hacer":
      return 0;
    case "en_curso":
      return 40;
    case "en_revision":
      return 80;
    case "completada":
      return 100;
    default:
      return 0;
  }
}
