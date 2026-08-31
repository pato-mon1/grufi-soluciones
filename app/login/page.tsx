import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { RUTA_INICIO } from "@/lib/nav";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Iniciar sesión · GRUFI SOLUCIONES",
};

export default async function LoginPage() {
  // Sin Supabase configurado la app funciona en modo local: no hay login.
  if (!isSupabaseConfigured()) {
    redirect(RUTA_INICIO);
  }

  // Si ya hay sesión, no mostrar el formulario: ir al área interna.
  // `getSession()` lee la cookie (sin llamada de red pesada).
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session) {
    redirect(RUTA_INICIO);
  }

  return <LoginForm />;
}
