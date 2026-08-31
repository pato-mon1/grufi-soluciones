import { ESTADO_CONFIG } from "@/lib/constants";
import { ESTADOS, type EstadoEmpresa } from "@/lib/types";

/**
 * Capa de presentación editable para los 6 estados de oportunidad.
 * `clave` ancla siempre a uno de los valores canónicos (lo que se guarda en
 * `empresas.estado`); solo la etiqueta, el color y el orden son personalizables.
 * El carácter de "cierre"/"ganada" NO cambia (vive en ESTADO_CONFIG y en la
 * lógica de Reportes/Finanzas).
 */
export interface EstadoOportunidad {
  clave: EstadoEmpresa;
  etiqueta: string;
  /** Color hex #RRGGBB. */
  color: string;
  orden: number;
  fechaCreacion: string;
  fechaActualizacion: string;
}

export type EstadoOportunidadInput = Pick<
  EstadoOportunidad,
  "clave" | "etiqueta" | "color" | "orden"
>;

/** Colores hex equivalentes a los tokens de la paleta actual. */
export const COLOR_ESTADO_BASE: Record<EstadoEmpresa, string> = {
  Pendiente: "#64748B",
  "En pláticas": "#D97706",
  "En avance": "#2563EB",
  Futura: "#7C3AED",
  "Cerrada - Ganada": "#3F7D62",
  "Cerrada - No concretada": "#9B4F55",
};

export interface EstadoResuelto {
  clave: EstadoEmpresa;
  etiqueta: string;
  color: string;
  orden: number;
  /** ¿Es un estado de cierre? (fijo, de ESTADO_CONFIG) */
  cerrado: boolean;
  /** `true` si el usuario guardó una personalización para este estado. */
  personalizado: boolean;
}

export const ESTADOS_BASE: EstadoResuelto[] = ESTADOS.map((clave, i) => ({
  clave,
  etiqueta: clave,
  color: COLOR_ESTADO_BASE[clave],
  orden: i,
  cerrado: ESTADO_CONFIG[clave].cerrado,
  personalizado: false,
}));

/** Combina los valores base con las personalizaciones guardadas. */
export function resolverEstados(
  overrides: EstadoOportunidad[],
): Record<EstadoEmpresa, EstadoResuelto> {
  const porClave = new Map(overrides.map((o) => [o.clave, o] as const));
  const salida = {} as Record<EstadoEmpresa, EstadoResuelto>;
  for (const base of ESTADOS_BASE) {
    const o = porClave.get(base.clave);
    salida[base.clave] = o
      ? {
          clave: base.clave,
          etiqueta: o.etiqueta.trim() || base.etiqueta,
          color: /^#[0-9a-fA-F]{6}$/.test(o.color) ? o.color : base.color,
          orden: Number.isFinite(o.orden) ? o.orden : base.orden,
          cerrado: base.cerrado,
          personalizado: true,
        }
      : base;
  }
  return salida;
}

/** Claves de estado ordenadas según el `orden` personalizado (estable). */
export function clavesOrdenadas(
  config: Record<EstadoEmpresa, EstadoResuelto>,
): EstadoEmpresa[] {
  return [...ESTADOS].sort((a, b) => {
    const d = config[a].orden - config[b].orden;
    return d !== 0 ? d : ESTADOS.indexOf(a) - ESTADOS.indexOf(b);
  });
}

/** Config por defecto (sin personalizaciones), útil fuera de React. */
export const ESTADOS_CONFIG_BASE = resolverEstados([]);
