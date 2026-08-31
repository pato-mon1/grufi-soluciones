import type { EstadoEmpresa, TipoActividad } from "@/lib/types";

/**
 * Configuración visual y semántica de cada estado. Es el ÚNICO lugar donde se
 * componen las clases de color de estado; los componentes solo leen de aquí.
 */
interface EstadoConfig {
  /** `text-*` con el color principal del estado (iconos, texto sobre blanco). */
  color: string;
  /** `bg-*` con el color principal — punto de color del selector. */
  dot: string;
  /** Etiqueta: fondo suave + borde suave + texto grafito para legibilidad. */
  badge: string;
  /** Solo el fondo suave (opción seleccionada del menú, iconos de tarjeta). */
  fondoSuave: string;
  /** ¿Es un estado de cierre? */
  cerrado: boolean;
}

// Estados abiertos: color principal saturado + fondo/borde suaves + texto grafito.
// "Cerrada - Ganada" (verde) y "Cerrada - No concretada" (rojo) NO cambian.
export const ESTADO_CONFIG: Record<EstadoEmpresa, EstadoConfig> = {
  Pendiente: {
    color: "text-estado-pendiente",
    dot: "bg-estado-pendiente",
    badge:
      "bg-estado-pendiente-suave text-foreground border-estado-pendiente-borde",
    fondoSuave: "bg-estado-pendiente-suave",
    cerrado: false,
  },
  "En pláticas": {
    color: "text-estado-platicas",
    dot: "bg-estado-platicas",
    badge:
      "bg-estado-platicas-suave text-foreground border-estado-platicas-borde",
    fondoSuave: "bg-estado-platicas-suave",
    cerrado: false,
  },
  "En avance": {
    color: "text-estado-avance",
    dot: "bg-estado-avance",
    badge:
      "bg-estado-avance-suave text-foreground border-estado-avance-borde",
    fondoSuave: "bg-estado-avance-suave",
    cerrado: false,
  },
  Futura: {
    color: "text-estado-futura",
    dot: "bg-estado-futura",
    badge:
      "bg-estado-futura-suave text-foreground border-estado-futura-borde",
    fondoSuave: "bg-estado-futura-suave",
    cerrado: false,
  },
  "Cerrada - Ganada": {
    color: "text-estado-ganada",
    dot: "bg-estado-ganada",
    badge:
      "bg-estado-ganada/12 text-estado-ganada-fg border-estado-ganada/30",
    fondoSuave: "bg-estado-ganada/12",
    cerrado: true,
  },
  "Cerrada - No concretada": {
    color: "text-estado-perdida",
    dot: "bg-estado-perdida",
    badge:
      "bg-estado-perdida/12 text-estado-perdida-fg border-estado-perdida/30",
    fondoSuave: "bg-estado-perdida/12",
    cerrado: true,
  },
};

/** Opciones de ordenamiento de la tabla. La primera es el orden predeterminado. */
export const OPCIONES_ORDEN = [
  { valor: "prioridad", etiqueta: "Prioridad de seguimiento" },
  { valor: "nombre", etiqueta: "Nombre" },
  { valor: "estado", etiqueta: "Estado" },
  { valor: "actualizacion", etiqueta: "Última actualización" },
  { valor: "seguimiento", etiqueta: "Próximo seguimiento" },
] as const;

/** Campo de ordenamiento predeterminado al abrir la aplicación. */
export const ORDEN_PREDETERMINADO = OPCIONES_ORDEN[0].valor;

export type CampoOrden = (typeof OPCIONES_ORDEN)[number]["valor"];

/** Claves usadas para persistir los datos en localStorage. */
export const STORAGE_KEY = "seguimiento-empresas:v1";
export const STORAGE_KEY_CONTACTOS = "seguimiento-contactos:v1";
export const STORAGE_KEY_ACTIVIDADES = "seguimiento-actividades:v1";
/** El usuario eligió "Continuar en modo local" pese a tener Supabase configurado. */
export const STORAGE_KEY_MODO = "seguimiento-modo:v1";

/** Nombres de las tablas en Supabase. */
export const SUPABASE_TABLE = "empresas";
export const SUPABASE_TABLE_CONTACTOS = "contactos";
export const SUPABASE_TABLE_ACTIVIDADES = "actividades";
// Fase 2
export const SUPABASE_TABLE_TAREAS = "tareas";
export const SUPABASE_TABLE_CATEGORIAS = "categorias_finanzas";
export const SUPABASE_TABLE_MOVIMIENTOS = "movimientos_financieros";
export const SUPABASE_TABLE_EVENTOS = "eventos_calendario";
export const SUPABASE_TABLE_PERFILES = "perfiles";
export const SUPABASE_TABLE_AJUSTES = "ajustes_app";
export const SUPABASE_TABLE_BITACORA = "bitacora";
export const SUPABASE_TABLE_ESTADOS = "estados_oportunidad";

/** Claves de localStorage para los módulos de la Fase 2. */
export const STORAGE_KEY_TAREAS = "seguimiento-tareas:v1";
export const STORAGE_KEY_CATEGORIAS = "seguimiento-categorias:v1";
export const STORAGE_KEY_MOVIMIENTOS = "seguimiento-movimientos:v1";
export const STORAGE_KEY_EVENTOS = "seguimiento-eventos:v1";
export const STORAGE_KEY_PERFIL = "seguimiento-perfil:v1";
export const STORAGE_KEY_AJUSTES = "seguimiento-ajustes:v1";
export const STORAGE_KEY_BITACORA = "seguimiento-bitacora:v1";
export const STORAGE_KEY_ESTADOS = "seguimiento-estados-oportunidad:v1";

/** Icono (lucide) y tono para cada tipo de actividad del historial. */
export const ACTIVIDAD_CONFIG: Record<
  TipoActividad,
  { icono: string; tono: string }
> = {
  Llamada: { icono: "Phone", tono: "text-estado-avance" },
  Correo: { icono: "Mail", tono: "text-estado-avance" },
  Junta: { icono: "Users", tono: "text-estado-platicas" },
  Nota: { icono: "StickyNote", tono: "text-muted-foreground" },
  "Cambio de estado": { icono: "ArrowLeftRight", tono: "text-champagne" },
  "Seguimiento completado": { icono: "CalendarCheck", tono: "text-exito" },
};
