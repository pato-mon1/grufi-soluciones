import { NextResponse } from "next/server";
import { exigirAdminApi } from "@/lib/api/admin-guard";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { tieneServiceRole } from "@/lib/supabase/config";
import { MODULOS, NIVELES_ACCESO } from "@/lib/permisos";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ROLES = ["admin", "ventas", "finanzas", "colaborador", "personalizado"];
const ESTADOS = ["activo", "inactivo", "pendiente"];

export async function GET(): Promise<NextResponse> {
  const ctx = await exigirAdminApi();
  if (ctx instanceof NextResponse) return ctx;
  return NextResponse.json({ disponible: tieneServiceRole() });
}

export async function POST(request: Request): Promise<NextResponse> {
  const ctx = await exigirAdminApi();
  if (ctx instanceof NextResponse) return ctx;

  if (!tieneServiceRole()) {
    return NextResponse.json(
      {
        error:
          "Falta SUPABASE_SERVICE_ROLE_KEY en el servidor (Vercel → Settings → Environment Variables).",
      },
      { status: 501 },
    );
  }

  let b: {
    correo?: unknown;
    nombre?: unknown;
    puesto?: unknown;
    rolGeneral?: unknown;
    estado?: unknown;
    permisos?: unknown;
  };
  try {
    b = await request.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo inválido." }, { status: 400 });
  }

  const correo = String(b.correo ?? "").trim().toLowerCase();
  const nombre = String(b.nombre ?? "").trim();
  const puesto = String(b.puesto ?? "").trim();
  const rolGeneral = ROLES.includes(String(b.rolGeneral))
    ? String(b.rolGeneral)
    : "personalizado";
  const estadoPedido = ESTADOS.includes(String(b.estado))
    ? String(b.estado)
    : "pendiente";
  const permisosIn = (b.permisos ?? {}) as Record<string, string>;

  if (!CORREO_RE.test(correo)) {
    return NextResponse.json(
      { error: "Escribe un correo válido." },
      { status: 400 },
    );
  }

  // Normaliza el mapa de permisos: los 8 módulos, nivel válido, default 'none'.
  const permisos: Record<string, string> = {};
  for (const m of MODULOS) {
    const v = permisosIn[m];
    permisos[m] = (NIVELES_ACCESO as readonly string[]).includes(v) ? v : "none";
  }

  const admin = createSupabaseAdminClient();

  // 1) Invitar por correo (o localizar la cuenta si ya existe).
  let userId: string | null = null;
  let invitada = false;
  const { data: inv, error: errInv } =
    await admin.auth.admin.inviteUserByEmail(correo, {
      data: { nombre, invitado_por: ctx.userId },
    });
  if (inv?.user) {
    userId = inv.user.id;
    invitada = true;
  } else {
    const yaExiste =
      errInv?.message?.toLowerCase().includes("already") ||
      errInv?.message?.toLowerCase().includes("registered") ||
      errInv?.status === 422;
    if (!yaExiste) {
      return NextResponse.json(
        { error: errInv?.message ?? "No se pudo enviar la invitación." },
        { status: 400 },
      );
    }
    const { data: lista } = await admin.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    userId =
      lista?.users.find((u) => (u.email ?? "").toLowerCase() === correo)?.id ??
      null;
    if (!userId) {
      return NextResponse.json(
        { error: "El correo ya está registrado pero no se localizó la cuenta." },
        { status: 409 },
      );
    }
  }

  const rolMiembro = rolGeneral === "admin" ? "admin" : "miembro";
  const estado = invitada ? "pendiente" : estadoPedido;

  // 2) Perfil (los permisos quedan preparados aunque siga pendiente).
  const { error: errPerfil } = await admin.from("perfiles").upsert(
    {
      user_id: userId,
      nombre,
      correo,
      puesto,
      rol_general: rolGeneral,
      rol: rolMiembro,
      estado,
      activo: estado === "activo",
    },
    { onConflict: "user_id" },
  );
  if (errPerfil) {
    return NextResponse.json({ error: errPerfil.message }, { status: 500 });
  }

  // 3) Membresía de la organización.
  await admin.from("miembros_organizacion").upsert(
    { org_id: ctx.orgId, user_id: userId, rol: rolMiembro, correo },
    { onConflict: "org_id,user_id" },
  );

  // 4) Fila de invitación pendiente (para aceptar_invitaciones() al primer login).
  const { data: invExistente } = await admin
    .from("invitaciones")
    .select("id")
    .eq("org_id", ctx.orgId)
    .eq("correo", correo)
    .eq("estado", "pendiente")
    .maybeSingle();
  if (!invExistente) {
    await admin
      .from("invitaciones")
      .insert({ org_id: ctx.orgId, correo, rol: rolMiembro });
  }

  // 5) Permisos por módulo.
  const filas = MODULOS.map((m) => ({
    user_id: userId,
    org_id: ctx.orgId,
    module_key: m,
    access_level: permisos[m],
    created_by: ctx.userId,
  }));
  const { error: errPerms } = await admin
    .from("user_module_permissions")
    .upsert(filas, { onConflict: "user_id,module_key" });
  if (errPerms) {
    return NextResponse.json(
      { error: `Se invitó pero fallaron los permisos: ${errPerms.message}` },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, invitada, userId });
}
