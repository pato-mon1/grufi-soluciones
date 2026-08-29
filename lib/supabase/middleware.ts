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
 * Protege el CRM y mantiene la cookie de sesión al día.
 *
 * Para no saturar el servicio de Auth de Supabase (puede ser lento en el plan
 * gratuito), solo actúa en navegaciones reales de página. Las subpeticiones
 * internas de Next (RSC, prefetch, fetch) pasan directo: la página Server
 * Component y el cliente ya validan la sesión, y las RLS de la base de datos
 * son la barrera de seguridad real.
 *
 * Usa `getSession()` (lee y refresca la cookie) en vez de `getUser()` (que
 * hace una llamada de red que valida el JWT en cada invocación).
 */
export async function updateSession(
  request: NextRequest,
): Promise<NextResponse> {
  let response = NextResponse.next({ request });

  // Modo local: sin autenticación.
  if (!isSupabaseConfigured()) {
    return response;
  }

  // Solo las navegaciones de documento pasan por la verificación completa.
  const destino = request.headers.get("sec-fetch-dest");
  if (destino && destino !== "document") {
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

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const { pathname } = request.nextUrl;
  const esRutaPublica = RUTAS_PUBLICAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  );

  if (!session && !esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  if (session && esRutaPublica) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
