import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/login-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Iniciar sesión · GRUFI SOLUCIONES",
};

export default async function LoginPage() {
  // Sin Supabase configurado la app funciona en modo local: no hay login.
  if (!isSupabaseConfigured()) {
    redirect("/");
  }

  // Si ya hay sesión, no mostrar el formulario: ir al dashboard.
  const supabase = createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) {
    redirect("/");
  }

  return <LoginForm />;
}
