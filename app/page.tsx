import { redirect } from "next/navigation";
import { RUTA_INICIO } from "@/lib/nav";

/**
 * Raíz: siempre lleva al área interna. El middleware ya redirige a `/login`
 * cuando no hay sesión (y hay Supabase configurado).
 */
export default function HomePage() {
  redirect(RUTA_INICIO);
}
