import type { Empresa, EstadoEmpresa } from "@/lib/types";
import { ESTADO_CONFIG } from "@/lib/constants";
import { hoyISO } from "@/lib/date";

export const ESTADO_GANADA: EstadoEmpresa = "Cerrada - Ganada";
export const ESTADO_PERDIDA: EstadoEmpresa = "Cerrada - No concretada";

/** Rango de fechas (YYYY-MM-DD) para acotar el reporte. */
export interface RangoFechas {
  desde: string;
  hasta: string;
}

/** ¿La empresa se cerró (ganó o perdió) dentro del rango? */
function cerradaEnRango(empresa: Empresa, rango: RangoFechas): boolean {
  if (!ESTADO_CONFIG[empresa.estado].cerrado) return false;
  const dia = empresa.fechaActualizacion.slice(0, 10);
  return dia >= rango.desde && dia <= rango.hasta;
}

/** Días que una empresa lleva (o llevó) en proceso. */
export function diasEnProceso(
  empresa: Empresa,
  hoy: string = hoyISO(),
): number {
  const inicio = new Date(
    `${empresa.fechaCreacion.slice(0, 10)}T00:00:00`,
  ).getTime();
  const fin = ESTADO_CONFIG[empresa.estado].cerrado
    ? new Date(`${empresa.fechaActualizacion.slice(0, 10)}T00:00:00`).getTime()
    : new Date(`${hoy}T00:00:00`).getTime();
  return Math.max(0, Math.round((fin - inicio) / 86_400_000));
}

/** Probabilidad de cierre estimada por estado (editable en la Fase 2). */
export function probabilidadPorEstado(estado: EstadoEmpresa): number {
  switch (estado) {
    case "Futura":
      return 10;
    case "Pendiente":
      return 25;
    case "En pláticas":
      return 50;
    case "En avance":
      return 75;
    case ESTADO_GANADA:
      return 100;
    case ESTADO_PERDIDA:
      return 0;
    default:
      return 0;
  }
}

export interface MetricasComerciales {
  /** Conversión = ganadas / (ganadas + perdidas) × 100. 0 si no hay cerradas. */
  conversion: number;
  /** Pipeline = suma de montos de oportunidades abiertas (no cerradas). */
  pipeline: number;
  /** Valor de las oportunidades ganadas en el rango. */
  valorGanado: number;
  ganadas: number;
  perdidas: number;
  abiertas: number;
  /** Ciclo promedio de cierre en días (empresas cerradas en el rango). */
  cicloPromedioDias: number;
}

/**
 * Métricas comerciales del rango indicado.
 * - Conversión y ciclo se calculan sobre las empresas **cerradas dentro del rango**.
 * - Pipeline se calcula sobre las empresas **abiertas** al momento.
 */
export function calcularMetricasComerciales(
  empresas: Empresa[],
  rango: RangoFechas,
): MetricasComerciales {
  let ganadas = 0;
  let perdidas = 0;
  let abiertas = 0;
  let pipeline = 0;
  let valorGanado = 0;
  let sumaDiasCierre = 0;
  let nCerradas = 0;

  for (const empresa of empresas) {
    const cerrada = ESTADO_CONFIG[empresa.estado].cerrado;

    if (!cerrada) {
      abiertas += 1;
      pipeline += empresa.montoResultado ?? 0;
      continue;
    }

    if (!cerradaEnRango(empresa, rango)) continue;

    nCerradas += 1;
    sumaDiasCierre += diasEnProceso(empresa);
    if (empresa.estado === ESTADO_GANADA) {
      ganadas += 1;
      valorGanado += empresa.montoResultado ?? 0;
    } else {
      perdidas += 1;
    }
  }

  const totalCerradas = ganadas + perdidas;
  return {
    conversion:
      totalCerradas === 0
        ? 0
        : redondear1((ganadas / totalCerradas) * 100),
    pipeline: redondear2(pipeline),
    valorGanado: redondear2(valorGanado),
    ganadas,
    perdidas,
    abiertas,
    cicloPromedioDias:
      nCerradas === 0 ? 0 : Math.round(sumaDiasCierre / nCerradas),
  };
}

/** Conteo de empresas por estado (para el embudo y las barras). */
export function empresasPorEstado(
  empresas: Empresa[],
): Record<EstadoEmpresa, number> {
  const acc = Object.fromEntries(
    (Object.keys(ESTADO_CONFIG) as EstadoEmpresa[]).map((e) => [e, 0]),
  ) as Record<EstadoEmpresa, number>;
  for (const empresa of empresas) acc[empresa.estado] += 1;
  return acc;
}

export interface FilaReporte {
  empresa: string;
  estado: EstadoEmpresa;
  monto: number | null;
  probabilidad: number;
  resultado: "Ganada" | "Perdida" | "Abierta";
  diasEnProceso: number;
}

/** Tabla detallada del reporte, ordenada por monto descendente. */
export function filasDetalle(
  empresas: Empresa[],
  hoy: string = hoyISO(),
): FilaReporte[] {
  return [...empresas]
    .map((e) => ({
      empresa: e.nombre,
      estado: e.estado,
      monto: e.montoResultado,
      probabilidad: probabilidadPorEstado(e.estado),
      resultado:
        e.estado === ESTADO_GANADA
          ? ("Ganada" as const)
          : e.estado === ESTADO_PERDIDA
            ? ("Perdida" as const)
            : ("Abierta" as const),
      diasEnProceso: diasEnProceso(e, hoy),
    }))
    .sort((a, b) => (b.monto ?? 0) - (a.monto ?? 0));
}

function redondear1(n: number): number {
  return Math.round((n + Number.EPSILON) * 10) / 10;
}
function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}
