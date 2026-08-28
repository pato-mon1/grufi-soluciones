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
