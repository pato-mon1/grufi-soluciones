/**
 * Utilidades de zona horaria sin librerías externas, basadas en
 * `Intl.DateTimeFormat`. Se usan en el Calendario para guardar los eventos
 * como instantes UTC reales y mostrarlos en la zona configurada por el
 * usuario (por defecto America/Monterrey).
 */

const ZONA_PREDETERMINADA = "America/Monterrey";

function partesEnZona(fecha: Date, zona: string): Record<string, number> {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone: zona,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const salida: Record<string, number> = {};
  for (const parte of dtf.formatToParts(fecha)) {
    if (parte.type !== "literal") salida[parte.type] = Number(parte.value);
  }
  return salida;
}

/**
 * Diferencia (ms) entre la hora de pared en `zona` y UTC para el instante dado.
 * Positivo al este de Greenwich, negativo al oeste (Monterrey ≈ -6h).
 */
export function offsetZonaMs(fecha: Date, zona: string): number {
  const p = partesEnZona(fecha, zona);
  const comoUtc = Date.UTC(
    p.year,
    (p.month ?? 1) - 1,
    p.day ?? 1,
    p.hour ?? 0,
    p.minute ?? 0,
    p.second ?? 0,
  );
  return comoUtc - fecha.getTime();
}

/**
 * Convierte una hora de pared ("2026-06-18" + "09:30") interpretada en `zona`
 * al instante UTC correspondiente, en ISO (`...Z`).
 */
export function muroAUtcISO(
  fechaYmd: string,
  horaHm: string,
  zona: string = ZONA_PREDETERMINADA,
): string {
  const [y, m, d] = fechaYmd.slice(0, 10).split("-").map(Number);
  const [hh, mm] = (horaHm || "00:00").split(":").map(Number);
  // Primera aproximación: tratamos la hora de pared como si fuese UTC.
  const tentativa = new Date(
    Date.UTC(y, (m ?? 1) - 1, d ?? 1, hh ?? 0, mm ?? 0, 0),
  );
  // Corrige por el offset real de la zona en esa fecha.
  const offset = offsetZonaMs(tentativa, zona);
  return new Date(tentativa.getTime() - offset).toISOString();
}

/** Instante que representa un evento "de todo el día" en `fechaYmd`. */
export function inicioDiaUtcISO(
  fechaYmd: string,
  zona: string = ZONA_PREDETERMINADA,
): string {
  return muroAUtcISO(fechaYmd, "00:00", zona);
}

/** ISO UTC -> "YYYY-MM-DD" en la zona indicada. */
export function fechaEnZona(
  iso: string,
  zona: string = ZONA_PREDETERMINADA,
): string {
  const p = partesEnZona(new Date(iso), zona);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** ISO UTC -> "HH:MM" (24h) en la zona indicada. */
export function horaEnZona(
  iso: string,
  zona: string = ZONA_PREDETERMINADA,
): string {
  const p = partesEnZona(new Date(iso), zona);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(p.hour)}:${pad(p.minute)}`;
}
