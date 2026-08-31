/** Estados posibles de una oportunidad comercial. */
export const ESTADOS = [
  "Pendiente",
  "En pláticas",
  "En avance",
  "Futura",
  "Cerrada - Ganada",
  "Cerrada - No concretada",
] as const;

export type EstadoEmpresa = (typeof ESTADOS)[number];

/** Registro completo de una empresa / oportunidad. */
export interface Empresa {
  id: string;
  nombre: string;
  estado: EstadoEmpresa;
  /** Monto del resultado en pesos mexicanos (MXN). `null` cuando está vacío. */
  montoResultado: number | null;
  notas: string;
  /** Fecha (YYYY-MM-DD) del último contacto. */
  fechaUltimoContacto: string | null;
  /** Fecha (YYYY-MM-DD) del próximo seguimiento. */
  fechaProximoSeguimiento: string | null;
  /**
   * Marca manual "Próximo seguimiento". Es independiente de
   * `fechaProximoSeguimiento`: una empresa puede estar marcada sin tener fecha.
   */
  requiereSeguimiento: boolean;
  /** Fecha ISO de creación. */
  fechaCreacion: string;
  /** Fecha ISO de la última actualización. */
  fechaActualizacion: string;
}

/** Datos editables por el usuario (sin metadatos administrados por el sistema). */
export type EmpresaInput = Omit<
  Empresa,
  "id" | "fechaCreacion" | "fechaActualizacion"
>;

/** Comprueba si un valor arbitrario es un estado válido. */
export function esEstadoValido(valor: unknown): valor is EstadoEmpresa {
  return (
    typeof valor === "string" && (ESTADOS as readonly string[]).includes(valor)
  );
}

// ────────────────────────────────────────────────────────────
// Contactos (varios por empresa)
// ────────────────────────────────────────────────────────────

export interface Contacto {
  id: string;
  empresaId: string;
  nombre: string;
  puesto: string;
  telefono: string;
  correo: string;
  /** Solo un contacto principal por empresa. */
  principal: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

/** Datos editables de un contacto. */
export type ContactoInput = Omit<
  Contacto,
  "id" | "empresaId" | "fechaCreacion" | "fechaActualizacion"
>;

/** Contacto en edición dentro del formulario (con `id` si ya existe). */
export type BorradorContacto = ContactoInput & { id?: string };

// ────────────────────────────────────────────────────────────
// Historial de actividades
// ────────────────────────────────────────────────────────────

export const TIPOS_ACTIVIDAD = [
  "Llamada",
  "Correo",
  "Junta",
  "Nota",
  "Cambio de estado",
  "Seguimiento completado",
] as const;

export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

export interface Actividad {
  id: string;
  empresaId: string;
  tipo: TipoActividad;
  /** Fecha y hora en que ocurrió la actividad (ISO). */
  fechaHora: string;
  descripcion: string;
  fechaCreacion: string;
  /** Correo del usuario que la registró, o "local". */
  usuario: string;
}

/** Datos de una actividad nueva (el repositorio asigna id/creación/usuario). */
export interface NuevaActividad {
  empresaId: string;
  tipo: TipoActividad;
  fechaHora: string;
  descripcion: string;
}

export function esTipoActividadValido(valor: unknown): valor is TipoActividad {
  return (
    typeof valor === "string" &&
    (TIPOS_ACTIVIDAD as readonly string[]).includes(valor)
  );
}

// ────────────────────────────────────────────────────────────
// FASE 2 — Tareas (tablero Kanban de 4 columnas)
// ────────────────────────────────────────────────────────────

export const ESTADOS_TAREA = [
  "pendiente",
  "en_progreso",
  "en_espera",
  "hecha",
] as const;
export type EstadoTarea = (typeof ESTADOS_TAREA)[number];

export const PRIORIDADES_TAREA = ["baja", "media", "alta"] as const;
export type PrioridadTarea = (typeof PRIORIDADES_TAREA)[number];

export interface Tarea {
  id: string;
  /** Empresa relacionada (opcional). */
  empresaId: string | null;
  titulo: string;
  descripcion: string;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  /** Fecha límite (YYYY-MM-DD) o `null`. */
  fechaLimite: string | null;
  /** ISO en que se marcó como hecha, o `null`. */
  fechaCompletada: string | null;
  /** Posición dentro de su columna (menor = más arriba). */
  orden: number;
  responsable: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type TareaInput = Omit<
  Tarea,
  "id" | "fechaCreacion" | "fechaActualizacion" | "fechaCompletada"
>;

export function esEstadoTareaValido(valor: unknown): valor is EstadoTarea {
  return (
    typeof valor === "string" &&
    (ESTADOS_TAREA as readonly string[]).includes(valor)
  );
}

// ────────────────────────────────────────────────────────────
// FASE 2 — Finanzas
// ────────────────────────────────────────────────────────────

export const TIPOS_MOVIMIENTO = ["ingreso", "egreso"] as const;
export type TipoMovimiento = (typeof TIPOS_MOVIMIENTO)[number];

export const ESTADOS_MOVIMIENTO = [
  "pendiente",
  "liquidado",
  "cancelado",
] as const;
export type EstadoMovimiento = (typeof ESTADOS_MOVIMIENTO)[number];

export interface CategoriaFinanza {
  id: string;
  nombre: string;
  tipo: TipoMovimiento;
  /** Color hex (#RRGGBB) para gráficas. */
  color: string;
  archivada: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type CategoriaFinanzaInput = Omit<
  CategoriaFinanza,
  "id" | "fechaCreacion" | "fechaActualizacion"
>;

export interface MovimientoFinanciero {
  id: string;
  empresaId: string | null;
  categoriaId: string | null;
  tipo: TipoMovimiento;
  concepto: string;
  /** Monto en MXN con 2 decimales. Siempre >= 0. */
  monto: number;
  estado: EstadoMovimiento;
  /** Fecha del movimiento o de vencimiento del cobro/pago (YYYY-MM-DD). */
  fecha: string;
  /** Fecha en que se liquidó (YYYY-MM-DD) o `null`. */
  fechaLiquidado: string | null;
  notas: string;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type MovimientoInput = Omit<
  MovimientoFinanciero,
  "id" | "fechaCreacion" | "fechaActualizacion"
>;

// ────────────────────────────────────────────────────────────
// FASE 2 — Calendario
// ────────────────────────────────────────────────────────────

export const TIPOS_EVENTO = [
  "evento",
  "reunion",
  "recordatorio",
  "llamada",
] as const;
export type TipoEvento = (typeof TIPOS_EVENTO)[number];

export interface EventoCalendario {
  id: string;
  empresaId: string | null;
  titulo: string;
  descripcion: string;
  /** ISO con hora. */
  inicio: string;
  /** ISO con hora, o `null`. */
  fin: string | null;
  todoElDia: boolean;
  tipo: TipoEvento;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type EventoInput = Omit<
  EventoCalendario,
  "id" | "fechaCreacion" | "fechaActualizacion"
>;

// ────────────────────────────────────────────────────────────
// FASE 2 — Configuración (perfil + ajustes)
// ────────────────────────────────────────────────────────────

export const ROLES_PERFIL = ["admin", "miembro"] as const;
export type RolPerfil = (typeof ROLES_PERFIL)[number];

export interface Perfil {
  nombre: string;
  correo: string;
  rol: RolPerfil;
  activo: boolean;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type PerfilInput = Pick<Perfil, "nombre" | "correo" | "rol" | "activo">;

/** Ajustes de la aplicación (una fila JSON por usuario). */
export interface AjustesApp {
  moneda: string;
  zonaHoraria: string;
  /** Meta de ingresos del año (MXN). 0 = sin meta. */
  metaAnual: number;
  /** Saldo inicial de caja (MXN) antes del primer movimiento. */
  saldoInicial: number;
  /** Días de anticipación para recordatorios. */
  notifSeguimientosDias: number;
  notifTareasDias: number;
  notifCobrosDias: number;
}

export const AJUSTES_PREDETERMINADOS: AjustesApp = {
  moneda: "MXN",
  zonaHoraria: "America/Monterrey",
  metaAnual: 0,
  saldoInicial: 0,
  notifSeguimientosDias: 3,
  notifTareasDias: 2,
  notifCobrosDias: 3,
};
