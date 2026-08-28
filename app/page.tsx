import { redirect } from "next/navigation";
import { EmpresasProvider } from "@/lib/hooks/use-empresas";
import { Dashboard } from "@/components/empresas/dashboard";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Validación de sesión en el servidor (defensa adicional al middleware):
  // sin Supabase se usa el modo local y no se exige inicio de sesión.
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      redirect("/login");
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <EmpresasProvider>
        <Dashboard />
      </EmpresasProvider>
    </main>
  );
}
