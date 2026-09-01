import { redirect } from "next/navigation";
import { EmpresasProvider } from "@/lib/hooks/use-empresas";
import { Fase2Provider } from "@/lib/hooks/use-fase2";
import { NotificacionesProvider } from "@/lib/hooks/use-notificaciones";
import { AppShell } from "@/components/app-shell/app-shell";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Layout del área interna protegida. Todas las páginas hijas comparten:
 *  - la comprobación de sesión (además del middleware),
 *  - una única fuente de datos (`EmpresasProvider`),
 *  - la barra lateral / drawer.
 */
export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
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
    <EmpresasProvider>
      <Fase2Provider>
        <NotificacionesProvider>
          <AppShell>{children}</AppShell>
        </NotificacionesProvider>
      </Fase2Provider>
    </EmpresasProvider>
  );
}
