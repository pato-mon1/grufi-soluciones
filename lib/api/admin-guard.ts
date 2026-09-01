import "server-only";
import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export interface ContextoAdmin {
  userId: string;
  orgId: string;
}

/**
 * Comprueba, en el servidor, que quien llama tiene sesión y es administrador
 * de una organización. Devuelve el contexto o una `NextResponse` de error.
 */
export async function exigirAdminApi(): Promise<ContextoAdmin | NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  }

  // rol_general = 'admin' en el perfil, o rol admin en una organización.
  const [perfilRes, membRes] = await Promise.all([
    supabase
      .from("perfiles")
      .select("rol_general, rol")
      .eq("user_id", session.user.id)
      .maybeSingle(),
    supabase
      .from("miembros_organizacion")
      .select("org_id, rol")
      .eq("user_id", session.user.id),
  ]);

  const esAdminPerfil =
    perfilRes.data?.rol_general === "admin" || perfilRes.data?.rol === "admin";
  const membAdmin = (membRes.data ?? []).find((m) => m.rol === "admin");
  const org = membAdmin?.org_id ?? (membRes.data ?? [])[0]?.org_id;

  if ((!esAdminPerfil && !membAdmin) || !org) {
    return NextResponse.json(
      { error: "Solo un administrador puede realizar esta acción." },
      { status: 403 },
    );
  }
  return { userId: session.user.id, orgId: org as string };
}
