import { redirect } from "next/navigation";
import { EmpresasProvider } from "@/lib/hooks/use-empresas";
import { Dashboard } from "@/components/empresas/dashboard";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function HomePage() {
  // Comprobación de sesión en el servidor (comodidad de UI; la seguridad real
  // la dan las RLS de la base de datos). Se usa `getSession()` — lee la cookie,
  // sin la llamada de red pesada de `getUser()`.
  // Sin Supabase se usa el modo local y no se exige inicio de sesión.
  if (isSupabaseConfigured()) {
    const supabase = createSupabaseServerClient();
    const {
      data: { session },
    } = await supabase.auth.getSession();
    if (!session) {
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
