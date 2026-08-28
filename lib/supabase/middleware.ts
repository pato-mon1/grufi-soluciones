import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  SUPABASE_KEY,
  SUPABASE_URL,
  isSupabaseConfigured,
} from "@/lib/supabase/config";

/** Rutas accesibles sin sesión. */
const RUTAS_PUBLICAS = ["/login"];

/**
 * Refresca la sesión de Supabase en cada petición (patrón recomendado para
 * Next.js App Router + `@supabase/ssr`) y protege el CRM:
 *
 *  - Sin Supabase configurado -> modo local, no se exige inicio de sesión.
 *  - Sin sesión y ruta protegida -> redirige a `/login`.
 *  - Con sesión y ruta `/login` -> redirige al dashboard.
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Modo local: sin autenticación.
  if (!isSupabaseConfigured()) {
    return response;
  }

  const supabase = createServerClient(SUPABASE_URL, SUPABASE_KEY, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  // `getUser()` valida el JWT contra el servidor de Supabase (no confía solo
  // en la cookie) y, de paso, refresca el token si hace falta.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const esRutaPublica = RUTAS_PUBLICAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );

  if (!user && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (user && esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
