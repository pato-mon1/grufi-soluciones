import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_KEY, SUPABASE_URL } from "@/lib/supabase/config";

/**
 * Cliente de Supabase para Server Components y Route Handlers.
 *
 * Lee y escribe la sesión en las cookies de la petición. El refresco real del
 * token lo realiza el middleware; aquí el `setAll` puede fallar en un Server
 * Component (cookies de solo lectura) y se ignora de forma segura.
 */
export function createSupabaseServerClient(): SupabaseClient {
  const cookieStore = cookies();

  return createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // Invocado desde un Server Component: el middleware ya refresca la sesión.
        }
      },
    },
  });
}
