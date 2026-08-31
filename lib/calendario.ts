import { ESTADO_CONFIG } from "@/lib/constants";
import { hoyISO } from "@/lib/date";
import { fechaEnZona, horaEnZona } from "@/lib/zona";
import type {
  Empresa,
  EventoCalendario,
  MovimientoFinanciero,
  Tarea,
} from "@/lib/types";

export type VistaCalendario = "mes" | "semana" | "dia";

export type TipoItemCalendario =
  | "seguimiento"
  | "tarea"
  | "cobro"
  | "pago"
  | "evento";

export interface ItemCalendario {
  /** Clave estable: `<tipo>:<origenId>`. */
  id: string;
  origenId: string;
  tipo: TipoItemCalendario;
  /** Fecha de calendario YYYY-MM-DD (sin zona horaria). */
  fecha: string;
  /** Hora HH:MM o `null` si es de todo el día. */
  hora: string | null;
  titulo: string;
  empresaNombre?: string;
  /** Ruta interna relacionada (para navegar al hacer clic). */
  enlace?: string;
}

const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

const DIAS_SEMANA = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

export function nombreMes(mes: number): string {
  return MESES[((mes % 12) + 12) % 12] ?? "";
}

export function etiquetasDiasSemana(): string[] {
  return DIAS_SEMANA;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/** Fecha local -> "YYYY-MM-DD" sin desfase de zona horaria. */
export function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** "YYYY-MM-DD" -> Date local a medianoche. */
export function desdeIso(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

/** Índice de día con la semana empezando en lunes (0 = lunes ... 6 = domingo). */
function indiceLunes(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export interface CeldaCalendario {
  iso: string;
  enMes: boolean;
  esHoy: boolean;
}

/** Rejilla de 6 semanas (42 celdas) que contiene el mes indicado. */
export function diasDelMes(
  anio: number,
  mes: number,
  hoy: string = hoyISO(),
): CeldaCalendario[] {
  const primero = new Date(anio, mes, 1);
  const inicio = new Date(primero);
  inicio.setDate(primero.getDate() - indiceLunes(primero));

  const celdas: CeldaCalendario[] = [];
  for (let i = 0; i < 42; i++) {
    const dia = new Date(inicio);
    dia.setDate(inicio.getDate() + i);
    const iso = isoLocal(dia);
    celdas.push({ iso, enMes: dia.getMonth() === mes, esHoy: iso === hoy });
  }
  return celdas;
}

/** Los 7 días (lunes a domingo) de la semana que contiene `fechaIso`. */
export function diasDeSemana(
  fechaIso: string,
  hoy: string = hoyISO(),
): CeldaCalendario[] {
  const base = desdeIso(fechaIso);
  const lunes = new Date(base);
  lunes.setDate(base.getDate() - indiceLunes(base));
  const dias: CeldaCalendario[] = [];
  for (let i = 0; i < 7; i++) {
    const dia = new Date(lunes);
    dia.setDate(lunes.getDate() + i);
    const iso = isoLocal(dia);
    dias.push({ iso, enMes: true, esHoy: iso === hoy });
  }
  return dias;
}

/** Suma (o resta) meses a un par {anio, mes}. */
export function desplazarMes(
  anio: number,
  mes: number,
  delta: number,
): { anio: number; mes: number } {
  const total = anio * 12 + mes + delta;
  return { anio: Math.floor(total / 12), mes: ((total % 12) + 12) % 12 };
}

/** Suma (o resta) días a una fecha ISO. */
export function desplazarDia(fechaIso: string, delta: number): string {
  const d = desdeIso(fechaIso);
  d.setDate(d.getDate() + delta);
  return isoLocal(d);
}

interface FuentesCalendario {
  empresas: Empresa[];
  tareas: Tarea[];
  movimientos: MovimientoFinanciero[];
  eventos: EventoCalendario[];
  /** Zona horaria para ubicar los eventos (por defecto America/Monterrey). */
  zona?: string;
}

/**
 * Reúne en una sola lista los elementos con fecha de todos los módulos:
 * seguimientos, tareas con fecha límite, cobros/pagos pendientes y eventos.
 * Los eventos (instantes UTC) se ubican en `zona`.
 */
export function construirItems({
  empresas,
  tareas,
  movimientos,
  eventos,
  zona,
}: FuentesCalendario): ItemCalendario[] {
  const nombreEmpresa = new Map<string, string>();
  for (const e of empresas) nombreEmpresa.set(e.id, e.nombre);

  const items: ItemCalendario[] = [];

  for (const e of empresas) {
    if (ESTADO_CONFIG[e.estado].cerrado) continue;
    if (!e.fechaProximoSeguimiento) continue;
    items.push({
      id: `seguimiento:${e.id}`,
      origenId: e.id,
      tipo: "seguimiento",
      fecha: e.fechaProximoSeguimiento.slice(0, 10),
      hora: null,
      titulo: e.nombre,
      empresaNombre: e.nombre,
      enlace: "/seguimientos",
    });
  }

  for (const t of tareas) {
    if (t.estado === "hecha" || !t.fechaLimite) continue;
    items.push({
      id: `tarea:${t.id}`,
      origenId: t.id,
      tipo: "tarea",
      fecha: t.fechaLimite.slice(0, 10),
      hora: null,
      titulo: t.titulo,
      empresaNombre: t.empresaId
        ? nombreEmpresa.get(t.empresaId)
        : undefined,
      enlace: "/tareas",
    });
  }

  for (const m of movimientos) {
    if (m.estado !== "pendiente") continue;
    items.push({
      id: `mov:${m.id}`,
      origenId: m.id,
      tipo: m.tipo === "ingreso" ? "cobro" : "pago",
      fecha: m.fecha.slice(0, 10),
      hora: null,
      titulo: m.concepto,
      empresaNombre: m.empresaId
        ? nombreEmpresa.get(m.empresaId)
        : undefined,
      enlace: "/finanzas",
    });
  }

  for (const ev of eventos) {
    items.push({
      id: `evento:${ev.id}`,
      origenId: ev.id,
      tipo: "evento",
      fecha: zona ? fechaEnZona(ev.inicio, zona) : ev.inicio.slice(0, 10),
      hora: ev.todoElDia
        ? null
        : zona
          ? horaEnZona(ev.inicio, zona)
          : ev.inicio.slice(11, 16),
      titulo: ev.titulo,
      empresaNombre: ev.empresaId
        ? nombreEmpresa.get(ev.empresaId)
        : undefined,
    });
  }

  return items;
}

/** Agrupa los items por fecha (YYYY-MM-DD), ordenados por hora dentro del día. */
export function itemsPorDia(
  items: ItemCalendario[],
): Record<string, ItemCalendario[]> {
  const mapa: Record<string, ItemCalendario[]> = {};
  for (const item of items) {
    (mapa[item.fecha] ??= []).push(item);
  }
  for (const fecha of Object.keys(mapa)) {
    mapa[fecha].sort((a, b) => {
      if (a.hora && b.hora) return a.hora.localeCompare(b.hora);
      if (a.hora) return -1;
      if (b.hora) return 1;
      return a.titulo.localeCompare(b.titulo);
    });
  }
  return mapa;
}
