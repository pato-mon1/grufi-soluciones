/**
 * Fórmulas financieras puras (compartidas por Reportes y, en la Fase 2, por
 * el módulo Finanzas). Los montos siempre en unidades enteras de MXN o con
 * 2 decimales; nunca se opera con formato de texto.
 */

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
