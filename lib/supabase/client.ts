import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

export { isSupabaseConfigured };

let cliente: SupabaseClient | undefined;

/**
 * Cliente de Supabase para el navegador (singleton).
 *
 * Usa `@supabase/ssr`, por lo que la sesión se guarda en cookies y queda
 * disponible también para el middleware y los Server Components. Solo se usa la
 * clave pública; nunca la `service_role`.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!isSupabaseConfigured()) {
    throw new Error(
      "Supabase no está configurado. Define NEXT_PUBLIC_SUPABASE_URL y NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }
  cliente ??= createBrowserClient(SUPABASE_URL, SUPABASE_KEY);
  return cliente;
}

/**
 * Devuelve el usuario de la sesión (id y correo), o `null`.
 *
 * Usa `getSession()` (lee la sesión guardada, sin red) en vez de `getUser()`
 * (que valida contra el servidor en cada llamada y puede tardar mucho en
 * proyectos con Auth lento). La verificación real de la sesión la hace el
 * middleware una sola vez por navegación.
 */
export async function getUsuarioActual(): Promise<{
  id: string;
  email: string;
} | null> {
  const {
    data: { session },
  } = await getSupabaseClient().auth.getSession();
  const user = session?.user;
  if (!user) return null;
  return { id: user.id, email: user.email ?? "" };
}
