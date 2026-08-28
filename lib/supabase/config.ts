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
