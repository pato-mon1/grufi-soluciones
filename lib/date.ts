import type { Empresa } from "@/lib/types";
import { ESTADO_CONFIG } from "@/lib/constants";

const formatoFecha = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const formatoFechaHora = new Intl.DateTimeFormat("es-MX", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const formatoFechaLarga = new Intl.DateTimeFormat("es-MX", {
  day: "numeric",
  month: "long",
  year: "numeric",
});

function aDate(valor: string): Date {
  // Fechas "YYYY-MM-DD" se interpretan en horario local (evita desfase de zona).
  return new Date(valor.length <= 10 ? `${valor}T00:00:00` : valor);
}

/** Fecha en formato largo: "28 de agosto de 2026" (para mensajes de actividad). */
export function formatearFechaLarga(valor: string | null | undefined): string {
  if (!valor) return "";
  const fecha = aDate(valor);
  if (Number.isNaN(fecha.getTime())) return "";
  return formatoFechaLarga.format(fecha);
}

/** Fecha y hora local actual en formato ISO sin zona (para `datetime-local`). */
export function ahoraLocalISO(): string {
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset() * 60_000;
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 16);
}

/** Formatea una fecha corta legible. Devuelve "—" si no hay valor. */
export function formatearFecha(valor: string | null | undefined): string {
  if (!valor) return "—";
  const fecha = aDate(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return formatoFecha.format(fecha);
}

/** Formatea fecha y hora. */
export function formatearFechaHora(valor: string | null | undefined): string {
  if (!valor) return "—";
  const fecha = aDate(valor);
  if (Number.isNaN(fecha.getTime())) return "—";
  return formatoFechaHora.format(fecha);
}

/** Fecha de hoy en formato YYYY-MM-DD (horario local). */
export function hoyISO(): string {
  const ahora = new Date();
  const offset = ahora.getTimezoneOffset() * 60_000;
  return new Date(ahora.getTime() - offset).toISOString().slice(0, 10);
}

/**
 * Una empresa tiene "seguimiento pendiente" cuando tiene fecha de próximo
 * seguimiento programada para hoy o antes y todavía no está cerrada.
 */
export function tieneSeguimientoPendiente(empresa: Empresa): boolean {
  if (ESTADO_CONFIG[empresa.estado].cerrado) return false;
  if (!empresa.fechaProximoSeguimiento) return false;
  return empresa.fechaProximoSeguimiento <= hoyISO();
}

/** Días restantes (negativo = atrasado) para el próximo seguimiento. */
export function diasParaSeguimiento(valor: string | null): number | null {
  if (!valor) return null;
  const objetivo = aDate(valor).getTime();
  const base = aDate(hoyISO()).getTime();
  return Math.round((objetivo - base) / 86_400_000);
}
