/**
 * Fórmulas financieras puras (compartidas por Reportes y por el módulo
 * Finanzas). Los montos siempre en unidades enteras de MXN o con 2
 * decimales; nunca se opera con formato de texto.
 */

import type {
  CategoriaFinanza,
  Empresa,
  MovimientoFinanciero,
  TipoMovimiento,
} from "@/lib/types";

/** Utilidad neta = ingresos − egresos. */
export function utilidadNeta(ingresos: number, egresos: number): number {
  return redondear2(ingresos - egresos);
}

/**
 * Margen = utilidad / ingresos × 100.
 * Si `ingresos` es 0 (o negativo), el margen es 0 por definición.
 */
export function margen(ingresos: number, egresos: number): number {
  if (!Number.isFinite(ingresos) || ingresos <= 0) return 0;
  return redondear2((utilidadNeta(ingresos, egresos) / ingresos) * 100);
}

export interface MovimientoSaldo {
  monto: number;
  tipo: "ingreso" | "egreso";
  liquidado: boolean;
}

/**
 * Saldo en caja = ingresos cobrados − egresos pagados.
 * Solo cuentan los movimientos marcados como liquidados.
 */
export function saldoEnCaja(movimientos: MovimientoSaldo[]): number {
  let saldo = 0;
  for (const m of movimientos) {
    if (!m.liquidado) continue;
    saldo += m.tipo === "ingreso" ? m.monto : -m.monto;
  }
  return redondear2(saldo);
}

function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ────────────────────────────────────────────────────────────
// Agregaciones del módulo Finanzas
// ────────────────────────────────────────────────────────────

export interface RangoFinanzas {
  desde: string;
  hasta: string;
}

function enRango(fecha: string, rango?: RangoFinanzas): boolean {
  if (!rango) return true;
  const dia = fecha.slice(0, 10);
  return dia >= rango.desde && dia <= rango.hasta;
}

const esLiquidado = (m: MovimientoFinanciero) => m.estado === "liquidado";
const esPendiente = (m: MovimientoFinanciero) => m.estado === "pendiente";

export interface ResumenFinanzas {
  /** Ingresos liquidados dentro del rango. */
  ingresos: number;
  /** Egresos liquidados dentro del rango. */
  egresos: number;
  /** ingresos − egresos. */
  utilidadNeta: number;
  /** Margen %. 0 si los ingresos son 0. */
  margen: number;
  /** Saldo inicial + todo lo liquidado hasta la fecha (acumulado, sin rango). */
  saldoCaja: number;
  /** Ingresos pendientes de cobro (sin importar el rango). */
  porCobrar: number;
  /** Egresos pendientes de pago (sin importar el rango). */
  porPagar: number;
}

/**
 * Resumen del módulo Finanzas.
 * - ingresos/egresos/utilidad/margen se calculan sobre lo **liquidado en el rango**.
 * - saldoCaja es acumulado (saldo inicial + liquidado histórico), no depende del rango.
 * - porCobrar/porPagar son los pendientes actuales.
 */
export function resumirFinanzas(
  movimientos: MovimientoFinanciero[],
  saldoInicial = 0,
  rango?: RangoFinanzas,
): ResumenFinanzas {
  let ingresos = 0;
  let egresos = 0;
  let saldo = Number.isFinite(saldoInicial) ? saldoInicial : 0;
  let porCobrar = 0;
  let porPagar = 0;

  for (const m of movimientos) {
    if (esLiquidado(m)) {
      saldo += m.tipo === "ingreso" ? m.monto : -m.monto;
      if (enRango(m.fecha, rango)) {
        if (m.tipo === "ingreso") ingresos += m.monto;
        else egresos += m.monto;
      }
    } else if (esPendiente(m)) {
      if (m.tipo === "ingreso") porCobrar += m.monto;
      else porPagar += m.monto;
    }
  }

  ingresos = redondear2(ingresos);
  egresos = redondear2(egresos);
  return {
    ingresos,
    egresos,
    utilidadNeta: utilidadNeta(ingresos, egresos),
    margen: margen(ingresos, egresos),
    saldoCaja: redondear2(saldo),
    porCobrar: redondear2(porCobrar),
    porPagar: redondear2(porPagar),
  };
}

export interface TotalPorCategoria {
  categoriaId: string | null;
  nombre: string;
  color: string;
  tipo: TipoMovimiento;
  total: number;
}

/** Totales liquidados por categoría para un tipo (ingreso o egreso). */
export function totalesPorCategoria(
  movimientos: MovimientoFinanciero[],
  categorias: CategoriaFinanza[],
  tipo: TipoMovimiento,
  rango?: RangoFinanzas,
): TotalPorCategoria[] {
  const porId = new Map<string, CategoriaFinanza>();
  for (const c of categorias) porId.set(c.id, c);

  const acumulado = new Map<string, number>();
  for (const m of movimientos) {
    if (m.tipo !== tipo || !esLiquidado(m) || !enRango(m.fecha, rango)) continue;
    const clave = m.categoriaId ?? "__sin__";
    acumulado.set(clave, (acumulado.get(clave) ?? 0) + m.monto);
  }

  const filas: TotalPorCategoria[] = [];
  acumulado.forEach((total, clave) => {
    const cat = clave === "__sin__" ? undefined : porId.get(clave);
    filas.push({
      categoriaId: cat?.id ?? null,
      nombre: cat?.nombre ?? "Sin categoría",
      color: cat?.color ?? "#77736B",
      tipo,
      total: redondear2(total),
    });
  });
  return filas.sort((a, b) => b.total - a.total);
}

export interface RentabilidadEmpresa {
  empresaId: string;
  nombre: string;
  ingresos: number;
  egresos: number;
  utilidad: number;
}

/** Rentabilidad (liquidada) por empresa, de mayor a menor utilidad. */
export function rentabilidadPorEmpresa(
  movimientos: MovimientoFinanciero[],
  empresas: Empresa[],
  rango?: RangoFinanzas,
): RentabilidadEmpresa[] {
  const nombre = new Map<string, string>();
  for (const e of empresas) nombre.set(e.id, e.nombre);

  const acc = new Map<string, { ingresos: number; egresos: number }>();
  for (const m of movimientos) {
    if (!m.empresaId || !esLiquidado(m) || !enRango(m.fecha, rango)) continue;
    const fila = acc.get(m.empresaId) ?? { ingresos: 0, egresos: 0 };
    if (m.tipo === "ingreso") fila.ingresos += m.monto;
    else fila.egresos += m.monto;
    acc.set(m.empresaId, fila);
  }

  const filas: RentabilidadEmpresa[] = [];
  acc.forEach((v, empresaId) => {
    filas.push({
      empresaId,
      nombre: nombre.get(empresaId) ?? "Empresa eliminada",
      ingresos: redondear2(v.ingresos),
      egresos: redondear2(v.egresos),
      utilidad: redondear2(v.ingresos - v.egresos),
    });
  });
  return filas.sort((a, b) => b.utilidad - a.utilidad);
}

export interface FlujoMes {
  mes: number;
  etiqueta: string;
  ingresos: number;
  egresos: number;
}

const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
];

/** Flujo mensual (liquidado) de un año: 12 entradas de enero a diciembre. */
export function flujoAnual(
  movimientos: MovimientoFinanciero[],
  anio: number,
): FlujoMes[] {
  const meses: FlujoMes[] = MESES_CORTOS.map((etiqueta, mes) => ({
    mes,
    etiqueta,
    ingresos: 0,
    egresos: 0,
  }));

  for (const m of movimientos) {
    if (!esLiquidado(m)) continue;
    if (Number(m.fecha.slice(0, 4)) !== anio) continue;
    const mesIndice = Number(m.fecha.slice(5, 7)) - 1;
    if (mesIndice < 0 || mesIndice > 11) continue;
    if (m.tipo === "ingreso") meses[mesIndice].ingresos += m.monto;
    else meses[mesIndice].egresos += m.monto;
  }

  return meses.map((m) => ({
    ...m,
    ingresos: redondear2(m.ingresos),
    egresos: redondear2(m.egresos),
  }));
}

/** Avance hacia la meta anual de ingresos (0–100+, redondeado a 1 decimal). */
export function avanceMeta(ingresosAnio: number, metaAnual: number): number {
  if (!Number.isFinite(metaAnual) || metaAnual <= 0) return 0;
  return Math.round((ingresosAnio / metaAnual) * 1000) / 10;
}
