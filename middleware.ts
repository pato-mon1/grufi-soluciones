import type { NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Todas las rutas excepto:
     *  - _next/static, _next/image (recursos internos de Next)
     *  - favicon y archivos de imagen estáticos
     * Así se protege el CRM y se refresca la sesión en cada navegación.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
