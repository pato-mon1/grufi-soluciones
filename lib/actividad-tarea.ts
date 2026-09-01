import { ETIQUETA_ESTADO_TAREA, type ActividadTarea } from "@/lib/types";
import { ETIQUETA_PRIORIDAD } from "@/lib/tareas";

type NombreFn = (userId: string | null | undefined) => string;

function valor(
  obj: Record<string, unknown> | null,
  clave: string,
): string | null {
  const v = obj?.[clave];
  return v === undefined || v === null ? null : String(v);
}

function fechaCorta(iso: string | null): string {
  if (!iso) return "sin fecha";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function etiquetaEstado(v: string | null): string {
  if (!v) return "—";
  return (
    ETIQUETA_ESTADO_TAREA[v as keyof typeof ETIQUETA_ESTADO_TAREA] ?? v
  );
}

function etiquetaPrioridad(v: string | null): string {
  if (!v) return "—";
  return (
    ETIQUETA_PRIORIDAD[v as keyof typeof ETIQUETA_PRIORIDAD] ?? v
  );
}

/**
 * Frase legible para una entrada de historial de tarea.
 * `nombre` resuelve un id de usuario a su nombre para mostrar.
 */
export function describirActividad(
  a: ActividadTarea,
  nombre: NombreFn,
): string {
  const actor = nombre(a.actorId);
  const prev = a.valoresPrevios;
  const nue = a.valoresNuevos;

  switch (a.accion) {
    case "crear":
      return `${actor} creó la tarea`;
    case "reasignar": {
      const antes = valor(prev, "asignado_a");
      const ahora = valor(nue, "asignado_a");
      if (!ahora) return `${actor} quitó al responsable`;
      if (!antes) return `${actor} asignó la tarea a ${nombre(ahora)}`;
      return `${actor} reasignó la tarea de ${nombre(antes)} a ${nombre(ahora)}`;
    }
    case "estado":
      return `${actor} cambió el estado de ${etiquetaEstado(
        valor(prev, "estado"),
      )} a ${etiquetaEstado(valor(nue, "estado"))}`;
    case "completar":
      return `${actor} marcó la tarea como completada`;
    case "reabrir":
      return `${actor} reabrió la tarea`;
    case "fecha": {
      const antes = fechaCorta(valor(prev, "vence_en"));
      const ahora = fechaCorta(valor(nue, "vence_en"));
      return `${actor} cambió la fecha límite del ${antes} al ${ahora}`;
    }
    case "prioridad":
      return `${actor} cambió la prioridad de ${etiquetaPrioridad(
        valor(prev, "prioridad"),
      )} a ${etiquetaPrioridad(valor(nue, "prioridad"))}`;
    case "avance":
      return `${actor} actualizó el avance a ${valor(nue, "progreso") ?? "0"}%`;
    case "comentario":
      return `${actor} agregó un comentario`;
    case "comentario_eliminado":
      return `${actor} eliminó un comentario`;
    default:
      return `${actor} · ${a.accion}`;
  }
}

/** Tipos de actividad para el filtro de la pestaña Actividad. */
export const TIPOS_ACTIVIDAD_TAREA: { valor: string; etiqueta: string }[] = [
  { valor: "crear", etiqueta: "Creación" },
  { valor: "reasignar", etiqueta: "Asignación" },
  { valor: "estado", etiqueta: "Cambio de estado" },
  { valor: "completar", etiqueta: "Completada" },
  { valor: "reabrir", etiqueta: "Reapertura" },
  { valor: "fecha", etiqueta: "Fecha límite" },
  { valor: "prioridad", etiqueta: "Prioridad" },
  { valor: "avance", etiqueta: "Avance" },
  { valor: "comentario", etiqueta: "Comentario" },
];
