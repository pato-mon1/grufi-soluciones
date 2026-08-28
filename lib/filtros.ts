import type { CampoOrden } from "@/lib/constants";
import { ESTADOS, type Empresa, type EstadoEmpresa } from "@/lib/types";
import { tieneSeguimientoPendiente } from "@/lib/date";

export type DireccionOrden = "asc" | "desc";
export type FiltroEstado = EstadoEmpresa | "todos";

export interface OpcionesFiltro {
  busqueda: string;
  estado: FiltroEstado;
  /** Solo empresas con seguimiento vencido/hoy según la fecha (no cerradas). */
  soloPendientes: boolean;
  /** Solo empresas con la marca manual "Próximo seguimiento" activada. */
  soloMarcadas: boolean;
  orden: CampoOrden;
  direccion: DireccionOrden;
}

const RANGO_ESTADO: Record<EstadoEmpresa, number> = ESTADOS.reduce(
  (acc, estado, indice) => {
    acc[estado] = indice;
    return acc;
  },
  {} as Record<EstadoEmpresa, number>,
);

/** Comparación alfabética que ignora mayúsculas/minúsculas y acentos. */
function compararNombre(a: Empresa, b: Empresa): number {
  return a.nombre.localeCompare(b.nombre, "es", { sensitivity: "base" });
}

/**
 * Grupo primario de "Prioridad de seguimiento" (la señal de seguimiento manda
 * sobre el estado). Se asigna al primer criterio que cumpla:
 *   1. Tiene fecha de "Próximo seguimiento".
 *   2. Sin fecha, pero con la marca/alerta "Próximo seguimiento" activada.
 *   3. El resto de las empresas (sin fecha ni alerta).
 */
export function grupoSeguimiento(empresa: Empresa): 1 | 2 | 3 {
  if (empresa.fechaProximoSeguimiento) return 1;
  if (empresa.requiereSeguimiento) return 2;
  return 3;
}

/**
 * Orden por estado dentro de cada grupo primario:
 *   1. "En avance"
 *   2. "En pláticas"
 *   3. "Pendiente"
 *   4. "Futura"
 *   5. "Cerrada - Ganada"
 *   6. "Cerrada - No concretada"  (tratada como "Cerrada - Perdida" en el orden;
 *      el nombre del estado no se cambia)
 */
function rangoEstadoPrioridad(estado: EstadoEmpresa): number {
  switch (estado) {
    case "En avance":
      return 1;
    case "En pláticas":
      return 2;
    case "Pendiente":
      return 3;
    case "Futura":
      return 4;
    case "Cerrada - Ganada":
      return 5;
    case "Cerrada - No concretada":
      return 6;
    default:
      return 99;
  }
}

function comparar(a: Empresa, b: Empresa, campo: CampoOrden): number {
  switch (campo) {
    case "prioridad": {
      const ga = grupoSeguimiento(a);
      const gb = grupoSeguimiento(b);
      if (ga !== gb) return ga - gb;
      const ea = rangoEstadoPrioridad(a.estado);
      const eb = rangoEstadoPrioridad(b.estado);
      if (ea !== eb) return ea - eb;
      // Mismo grupo y mismo estado -> alfabético A-Z (sin acentos ni mayúsculas).
      return compararNombre(a, b);
    }
    case "nombre":
      return compararNombre(a, b);
    case "estado":
      return RANGO_ESTADO[a.estado] - RANGO_ESTADO[b.estado];
    case "actualizacion":
      return a.fechaActualizacion.localeCompare(b.fechaActualizacion);
    case "seguimiento": {
      // Sin fecha => al final
      const va = a.fechaProximoSeguimiento ?? "9999-12-31";
      const vb = b.fechaProximoSeguimiento ?? "9999-12-31";
      return va.localeCompare(vb);
    }
    default:
      return 0;
  }
}

/** Aplica búsqueda, filtros y ordenamiento a la lista de empresas. */
export function filtrarYOrdenar(
  empresas: Empresa[],
  opciones: OpcionesFiltro,
): Empresa[] {
  const termino = opciones.busqueda.trim().toLowerCase();

  const filtradas = empresas.filter((empresa) => {
    if (termino && !empresa.nombre.toLowerCase().includes(termino)) {
      return false;
    }
    if (opciones.estado !== "todos" && empresa.estado !== opciones.estado) {
      return false;
    }
    if (opciones.soloPendientes && !tieneSeguimientoPendiente(empresa)) {
      return false;
    }
    if (opciones.soloMarcadas && !empresa.requiereSeguimiento) {
      return false;
    }
    return true;
  });

  const factor = opciones.direccion === "asc" ? 1 : -1;
  return filtradas.sort((a, b) => comparar(a, b, opciones.orden) * factor);
}

/** Cuenta cuántas empresas hay por cada estado + total y pendientes de seguimiento. */
export function calcularResumen(empresas: Empresa[]) {
  const porEstado = ESTADOS.reduce(
    (acc, estado) => {
      acc[estado] = 0;
      return acc;
    },
    {} as Record<EstadoEmpresa, number>,
  );

  let seguimientoPendiente = 0;
  let marcadasSeguimiento = 0;
  for (const empresa of empresas) {
    porEstado[empresa.estado] += 1;
    if (tieneSeguimientoPendiente(empresa)) seguimientoPendiente += 1;
    if (empresa.requiereSeguimiento) marcadasSeguimiento += 1;
  }

  return {
    total: empresas.length,
    porEstado,
    seguimientoPendiente,
    marcadasSeguimiento,
  };
}
