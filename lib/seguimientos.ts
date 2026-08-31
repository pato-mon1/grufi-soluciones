import type { Empresa } from "@/lib/types";
import { ESTADO_CONFIG } from "@/lib/constants";
import { hoyISO } from "@/lib/date";
import { filtrarYOrdenar } from "@/lib/filtros";

/** Clasificación de una empresa según su próximo seguimiento. */
export type BucketSeguimiento =
  | "vencido"
  | "hoy"
  | "proximos7"
  | "futuro"
  | "sinFecha"
  | "ninguno";

/** Diferencia en días (enteros) entre dos fechas `YYYY-MM-DD` (b - a). */
function diasEntre(a: string, b: string): number {
  const da = new Date(`${a}T00:00:00`).getTime();
  const db = new Date(`${b}T00:00:00`).getTime();
  return Math.round((db - da) / 86_400_000);
}

/**
 * Clasifica el seguimiento de una empresa respecto a `hoy` (YYYY-MM-DD).
 *  - Empresa cerrada -> "ninguno".
 *  - Con fecha anterior a hoy -> "vencido".
 *  - Con fecha igual a hoy -> "hoy".
 *  - Con fecha dentro de los próximos 7 días -> "proximos7".
 *  - Con fecha más allá -> "futuro".
 *  - Sin fecha pero marcada "Próximo seguimiento" -> "sinFecha".
 *  - En cualquier otro caso -> "ninguno".
 */
export function clasificarSeguimiento(
  empresa: Empresa,
  hoy: string = hoyISO(),
): BucketSeguimiento {
  if (ESTADO_CONFIG[empresa.estado].cerrado) return "ninguno";

  const fecha = empresa.fechaProximoSeguimiento;
  if (fecha) {
    const dias = diasEntre(hoy, fecha);
    if (dias < 0) return "vencido";
    if (dias === 0) return "hoy";
    if (dias <= 7) return "proximos7";
    return "futuro";
  }

  return empresa.requiereSeguimiento ? "sinFecha" : "ninguno";
}

export interface ResumenSeguimientos {
  vencido: number;
  hoy: number;
  proximos7: number;
  sinFecha: number;
}

/** Cuenta las empresas en cada bucket relevante para los indicadores. */
export function resumirSeguimientos(
  empresas: Empresa[],
  hoy: string = hoyISO(),
): ResumenSeguimientos {
  const r: ResumenSeguimientos = {
    vencido: 0,
    hoy: 0,
    proximos7: 0,
    sinFecha: 0,
  };
  for (const empresa of empresas) {
    const bucket = clasificarSeguimiento(empresa, hoy);
    if (bucket === "vencido") r.vencido += 1;
    else if (bucket === "hoy") r.hoy += 1;
    else if (bucket === "proximos7") r.proximos7 += 1;
    else if (bucket === "sinFecha") r.sinFecha += 1;
  }
  return r;
}

/** ¿Esta empresa aparece en la lista de "Prioridad de seguimiento"? */
export function requiereAtencion(
  empresa: Empresa,
  hoy: string = hoyISO(),
): boolean {
  return clasificarSeguimiento(empresa, hoy) !== "ninguno";
}

/**
 * Empresas que necesitan atención, ordenadas exactamente con el criterio
 * "Prioridad de seguimiento" que ya usa la tabla de Empresas.
 */
export function empresasParaSeguimiento(
  empresas: Empresa[],
  hoy: string = hoyISO(),
): Empresa[] {
  const relevantes = empresas.filter((e) => requiereAtencion(e, hoy));
  return filtrarYOrdenar(relevantes, {
    busqueda: "",
    estado: "todos",
    soloPendientes: false,
    soloMarcadas: false,
    orden: "prioridad",
    direccion: "asc",
  });
}

/** Etiqueta de prioridad legible a partir del bucket. */
export function prioridadDeBucket(
  bucket: BucketSeguimiento,
): "Alta" | "Media" | "Baja" | "—" {
  switch (bucket) {
    case "vencido":
    case "hoy":
      return "Alta";
    case "proximos7":
    case "sinFecha":
      return "Media";
    case "futuro":
      return "Baja";
    default:
      return "—";
  }
}
