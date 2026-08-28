/**
 * Utilidades para el "Monto del resultado" en pesos mexicanos (MXN).
 * El valor se almacena como `number` (>= 0) o `null` cuando está vacío.
 */

const formatoNumero = new Intl.NumberFormat("es-MX", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/**
 * Formatea un monto como `$250,000 MXN`.
 * Devuelve "—" cuando el monto es `null`/indefinido.
 */
export function formatearMonto(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || Number.isNaN(monto)) return "—";
  return `$${formatoNumero.format(monto)} MXN`;
}

export interface MontoParseado {
  /** Monto normalizado (>= 0) o `null` si el texto está vacío. */
  monto: number | null;
  /** `true` si el texto representa un monto válido o está vacío. */
  valido: boolean;
}

/**
 * Interpreta lo que el usuario escribe (`"$250,000 MXN"`, `"250000"`, `""`...).
 * - Texto vacío  -> { monto: null, valido: true }   (se permite dejarlo vacío)
 * - Número >= 0  -> { monto: <n>, valido: true }
 * - Cualquier otra cosa -> { monto: null, valido: false }
 */
export function parsearMonto(texto: string): MontoParseado {
  const limpio = texto
    .trim()
    .replace(/mxn/gi, "")
    .replace(/[$\s]/g, "")
    .replace(/,/g, "");

  if (limpio === "") return { monto: null, valido: true };

  const valor = Number(limpio);
  if (!Number.isFinite(valor) || valor < 0) {
    return { monto: null, valido: false };
  }

  // Redondea a 2 decimales para evitar imprecisiones de punto flotante.
  return { monto: Math.round(valor * 100) / 100, valido: true };
}

/** Convierte un monto almacenado a texto plano para editarlo en un input. */
export function montoATextoEntrada(monto: number | null | undefined): string {
  if (monto === null || monto === undefined || Number.isNaN(monto)) return "";
  return String(monto);
}
