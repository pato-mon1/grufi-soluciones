import { NextResponse } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tieneServiceRole } from "@/lib/supabase/config";
import type { RolPerfil } from "@/lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface ContextoAdmin {
  userId: string;
  orgId: string;
}

/** Comprueba sesión + rol admin. Devuelve el contexto o una respuesta de error. */
async function exigirAdmin(): Promise<ContextoAdmin | NextResponse> {
  const supabase = createSupabaseServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) {
    return NextResponse.json({ error: "Sin sesión." }, { status: 401 });
  }
  const { data: membresias, error } = await supabase
    .from("miembros_organizacion")
    .select("org_id, rol")
    .eq("user_id", session.user.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const admin = (membresias ?? []).find((m) => m.rol === "admin");
  if (!admin) {
    return NextResponse.json(
      { error: "Solo un administrador puede dar de alta usuarios." },
      { status: 403 },
    );
  }
  return { userId: session.user.id, orgId: admin.org_id as string };
}

export async function GET(): Promise<NextResponse> {
  const ctx = await exigirAdmin();
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json({ disponible: tieneServiceRole() });
}

export async function POST(request: Request): Promise<NextResponse> {
  const ctx = await exigirAdmin();
  if (ctx instanceof NextResponse) return ctx;

  if (!tieneServiceRole()) {
    return NextResponse.json(
      {
        error:
          "Falta configurar SUPABASE_SERVICE_ROLE_KEY en el servidor (Vercel → Settings → Environment Variables).",
      },
      { status: 501 },
    );
  }

  let cuerpo: { correo?: unknown; password?: unknown; rol?: unknown };
  try {
    cuerpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const correo = String(cuerpo.correo ?? "").trim().toLowerCase();
  const password = String(cuerpo.password ?? "");
  const rol: RolPerfil = cuerpo.rol === "admin" ? "admin" : "miembro";

  if (!CORREO_RE.test(correo)) {
    return NextResponse.json(
      { error: "Escribe un correo válido." },
      { status: 400 },
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "La contraseña temporal debe tener al menos 8 caracteres." },
      { status: 400 },
    );
  }

  const admin = createSupabaseAdminClient();

  // 1) Crear la cuenta (o reutilizarla si ya existe).
  let userId: string | null = null;
  let creada = false;
  const { data: creado, error: errCrear } = await admin.auth.admin.createUser({
    email: correo,
    password,
    email_confirm: true,
  });

  if (creado?.user) {
    userId = creado.user.id;
    creada = true;
  } else {
    const yaExiste =
      errCrear?.message?.toLowerCase().includes("already") ||
      errCrear?.message?.toLowerCase().includes("registered") ||
      errCrear?.status === 422;
    if (!yaExiste) {
      return NextResponse.json(
        { error: errCrear?.message ?? "No se pudo crear la cuenta." },
        { status: 400 },
      );
    }
    // Buscar el usuario existente por correo.
    const { data: lista } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    const encontrado = lista?.users.find(
      (u) => (u.email ?? "").toLowerCase() === correo,
    );
    if (!encontrado) {
      return NextResponse.json(
        { error: "Ese correo ya está registrado pero no se pudo localizar." },
        { status: 409 },
      );
    }
    userId = encontrado.id;
  }

  if (!userId) {
    return NextResponse.json(
      { error: "No se obtuvo el identificador del usuario." },
      { status: 500 },
    );
  }

  // 2) Añadirlo a la organización del administrador.
  const { error: errMiembro } = await admin
    .from("miembros_organizacion")
    .upsert(
      { org_id: ctx.orgId, user_id: userId, rol, correo },
      { onConflict: "org_id,user_id" },
    );
  if (errMiembro) {
    return NextResponse.json(
      {
        error: `La cuenta se creó pero no se pudo añadir a la organización: ${errMiembro.message}`,
      },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, creada, correo, rol });
}
