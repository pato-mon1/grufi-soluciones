/**
 * Configuración compartida de Supabase.
 *
 * Solo se leen variables de entorno con prefijo `NEXT_PUBLIC_`. NUNCA se debe
 * usar aquí (ni en ningún archivo del frontend) la `service_role` ni una
 * `secret key`: esas claves solo viven en el servidor de Supabase.
 *
 * No hay correos ni contraseñas en el código: los usuarios autorizados se
 * crean manualmente desde Supabase → Authentication → Users.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";

/**
 * Clave pública del proyecto. Se acepta el nombre nuevo
 * (`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`) y, como respaldo, el nombre anterior
 * (`NEXT_PUBLIC_SUPABASE_ANON_KEY`) para no romper entornos ya configurados.
 */
export const SUPABASE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

/**
 * `true` solo si hay URL y clave pública. Si es `false`, la aplicación funciona
 * en modo local (localStorage) y no exige inicio de sesión.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_KEY);
}

/**
 * Clave `service_role` — SOLO servidor. Nunca lleva prefijo `NEXT_PUBLIC_`, por
 * lo que jamás llega al navegador. Se usa exclusivamente en Route Handlers para
 * el alta de usuarios (Supabase Admin API). Si no está configurada, esa función
 * queda deshabilitada y el resto de la app no se ve afectada.
 */
export const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export function tieneServiceRole(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY);
}
