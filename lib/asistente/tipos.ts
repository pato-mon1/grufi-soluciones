/**
 * Tipos compartidos del "Asistente GRUFI" (cliente y servidor).
 *
 * El asistente es SOLO de consulta: nunca crea, edita ni elimina registros.
 * Toda respuesta se acompaña de las fuentes reales que se consultaron.
 */

/** Un registro concreto del CRM que respalda parte de una respuesta. */
export interface FuenteConsultada {
  /** Texto del botón: "Proyecto Senda", "Tareas pendientes"… */
  etiqueta: string;
  /** Categoría de la fuente (para el icono). */
  tipo:
    | "proyecto"
    | "empresa"
    | "tareas"
    | "seguimientos"
    | "finanzas"
    | "calendario"
    | "contactos"
    | "actividad";
  /** Ruta interna para abrir el registro dentro de GRUFI SOLUCIONES. */
  href: string;
}

export interface MensajeChat {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: FuenteConsultada[];
  feedback?: -1 | 1 | null;
  createdAt: string;
  /** Solo en cliente: la respuesta se está transmitiendo. */
  streaming?: boolean;
  /** Solo en cliente: hubo un error al generar esta respuesta. */
  error?: boolean;
}

export interface ConversacionChat {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

/** Eventos que el endpoint envía al cliente por streaming (NDJSON). */
export type EventoAsistente =
  | { t: "meta"; conversationId: string; title: string }
  | { t: "estado"; v: "consultando" | "redactando" }
  | { t: "delta"; v: string }
  | { t: "fuentes"; v: FuenteConsultada[] }
  | { t: "fin" }
  | { t: "error"; code: string; v: string };

/** Códigos de error que el cliente traduce a mensajes claros. */
export const ERR_ASISTENTE = {
  SIN_SESION: "SIN_SESION",
  IA_NO_CONFIGURADA: "IA_NO_CONFIGURADA",
  SIN_ACCESO: "SIN_ACCESO",
  LIMITE: "LIMITE",
  MENSAJE_INVALIDO: "MENSAJE_INVALIDO",
  TIEMPO_AGOTADO: "TIEMPO_AGOTADO",
  INTERNO: "INTERNO",
} as const;
