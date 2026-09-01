import { createSupabaseServerClient } from "@/lib/supabase/server";
import { proveedorConfigurado } from "@/lib/asistente/anthropic";
import { correrAsistente } from "@/lib/asistente/motor";
import { construirSistema } from "@/lib/asistente/sistema";
import type { ContextoHerramienta } from "@/lib/asistente/herramientas";
import {
  ERR_ASISTENTE,
  type EventoAsistente,
  type FuenteConsultada,
} from "@/lib/asistente/tipos";
import {
  resolverPermisos,
  tieneAcceso,
  type MapaPermisos,
} from "@/lib/permisos";
import type { MensajeIA } from "@/lib/asistente/anthropic";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const LIMITE_POR_HORA = 40;
const MAX_LARGO_MENSAJE = 2000;
const PRESUPUESTO_MS = 55_000;
const MAX_HISTORIAL = 16;
const MAX_CONTENIDO = 4000;

function json(cuerpo: unknown, status: number): Response {
  return new Response(JSON.stringify(cuerpo), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

function tituloDesde(mensaje: string): string {
  const limpio = mensaje.replace(/\s+/g, " ").trim();
  return limpio.length > 60 ? `${limpio.slice(0, 60)}…` : limpio || "Nueva conversación";
}

/** Fusiona mensajes consecutivos del mismo rol (Anthropic exige alternancia). */
function normalizarHistorial(
  filas: Array<{ role: string; content: string }>,
): MensajeIA[] {
  const out: MensajeIA[] = [];
  for (const f of filas) {
    const role = f.role === "assistant" ? "assistant" : "user";
    const content = (f.content ?? "").slice(0, MAX_CONTENIDO);
    const ultimo = out[out.length - 1];
    if (ultimo && ultimo.role === role && typeof ultimo.content === "string") {
      ultimo.content = `${ultimo.content}\n\n${content}`;
    } else {
      out.push({ role, content });
    }
  }
  while (out.length > 0 && out[0].role === "assistant") out.shift();
  return out;
}

export async function GET(): Promise<Response> {
  const sb = createSupabaseServerClient();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) return json({ error: ERR_ASISTENTE.SIN_SESION }, 401);
  return json({ iaConfigurada: proveedorConfigurado() }, 200);
}

export async function POST(request: Request): Promise<Response> {
  const sb = createSupabaseServerClient();
  const {
    data: { session },
  } = await sb.auth.getSession();
  if (!session) {
    return json({ error: ERR_ASISTENTE.SIN_SESION }, 401);
  }

  if (!proveedorConfigurado()) {
    return json(
      {
        error: ERR_ASISTENTE.IA_NO_CONFIGURADA,
        mensaje:
          "El Asistente GRUFI necesita configurar el proveedor de inteligencia artificial.",
      },
      503,
    );
  }

  let body: { conversationId?: unknown; mensaje?: unknown };
  try {
    body = await request.json();
  } catch {
    return json({ error: ERR_ASISTENTE.MENSAJE_INVALIDO }, 400);
  }
  const mensaje = String(body.mensaje ?? "").trim();
  if (!mensaje || mensaje.length > MAX_LARGO_MENSAJE) {
    return json({ error: ERR_ASISTENTE.MENSAJE_INVALIDO }, 400);
  }
  const conversationIdPedida =
    typeof body.conversationId === "string" ? body.conversationId : null;

  const userId = session.user.id;

  // ── Permisos ────────────────────────────────────────────────
  const [permsRes, adminRes, ajustesRes] = await Promise.all([
    sb
      .from("user_module_permissions")
      .select("module_key, access_level")
      .eq("user_id", userId),
    sb.rpc("soy_admin"),
    sb.from("ajustes_app").select("datos").maybeSingle(),
  ]);
  const esAdmin = adminRes.data === true;
  const permisos: MapaPermisos = resolverPermisos(permsRes.data ?? [], esAdmin);
  if (!esAdmin && !tieneAcceso(permisos.asistente, "view")) {
    return json({ error: ERR_ASISTENTE.SIN_ACCESO }, 403);
  }

  const tz =
    (ajustesRes.data?.datos as { zonaHoraria?: string } | null)?.zonaHoraria ||
    "America/Monterrey";

  // ── Límite de uso ───────────────────────────────────────────
  const uso = await sb.rpc("asistente_uso_reciente", { p_minutos: 60 });
  if (typeof uso.data === "number" && uso.data >= LIMITE_POR_HORA) {
    return json(
      {
        error: ERR_ASISTENTE.LIMITE,
        mensaje:
          "Alcanzaste el límite de preguntas por hora. Intenta de nuevo más tarde.",
      },
      429,
    );
  }

  // ── Conversación ────────────────────────────────────────────
  let conversationId = conversationIdPedida;
  let title = "";
  if (conversationId) {
    const { data } = await sb
      .from("assistant_conversations")
      .select("id, title")
      .eq("id", conversationId)
      .maybeSingle();
    if (!data) {
      conversationId = null;
    } else {
      title = data.title as string;
    }
  }
  if (!conversationId) {
    title = tituloDesde(mensaje);
    const { data, error } = await sb
      .from("assistant_conversations")
      .insert({ title })
      .select("id, title")
      .single();
    if (error || !data) {
      return json({ error: ERR_ASISTENTE.INTERNO }, 500);
    }
    conversationId = data.id as string;
  }

  const { error: errUser } = await sb.from("assistant_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: mensaje,
  });
  if (errUser) {
    return json({ error: ERR_ASISTENTE.INTERNO }, 500);
  }

  const { data: histRows } = await sb
    .from("assistant_messages")
    .select("role, content, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  const historial = normalizarHistorial(
    (histRows ?? []).slice(-MAX_HISTORIAL) as Array<{
      role: string;
      content: string;
    }>,
  );
  if (historial.length === 0) {
    historial.push({ role: "user", content: mensaje });
  }

  const ahora = new Date();
  const ahoraTexto = new Intl.DateTimeFormat("es-MX", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: tz,
  }).format(ahora);

  const system = construirSistema({
    permisos,
    esAdmin,
    ahoraTexto,
    tz,
    nombreUsuario: session.user.email?.split("@")[0] ?? "el usuario",
  });

  const ctx: ContextoHerramienta = {
    sb,
    permisos,
    esAdmin,
    userId,
    tz,
    ahora,
  };

  // ── Stream NDJSON ──────────────────────────────────────────
  const encoder = new TextEncoder();
  const ac = new AbortController();
  const onAbort = () => ac.abort();
  request.signal.addEventListener("abort", onAbort);
  const timer = setTimeout(() => ac.abort(), PRESUPUESTO_MS);

  const convId = conversationId;
  const convTitle = title;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let cerrado = false;
      let textoAcumulado = "";
      let fuentes: FuenteConsultada[] = [];
      const enviar = (e: EventoAsistente) => {
        if (cerrado) return;
        controller.enqueue(encoder.encode(`${JSON.stringify(e)}\n`));
        if (e.t === "delta") textoAcumulado += e.v;
        if (e.t === "fuentes") fuentes = e.v;
      };

      enviar({ t: "meta", conversationId: convId, title: convTitle });

      try {
        await correrAsistente({
          historial,
          system,
          ctx,
          signal: ac.signal,
          emitir: enviar,
        });
        if (textoAcumulado.trim()) {
          enviar({ t: "fin" });
        } else if (!ac.signal.aborted) {
          enviar({
            t: "error",
            code: ERR_ASISTENTE.INTERNO,
            v: "No se obtuvo una respuesta. Intenta reformular la pregunta.",
          });
        }
      } catch {
        const abortado = ac.signal.aborted;
        enviar({
          t: "error",
          code: abortado
            ? ERR_ASISTENTE.TIEMPO_AGOTADO
            : ERR_ASISTENTE.INTERNO,
          v: abortado
            ? "La consulta tardó demasiado. Intenta acotar la pregunta."
            : "No se pudo completar la respuesta.",
        });
      } finally {
        clearTimeout(timer);
        request.signal.removeEventListener("abort", onAbort);
        // Persistir la respuesta (aunque sea parcial) para el historial.
        if (textoAcumulado.trim()) {
          try {
            await sb.from("assistant_messages").insert({
              conversation_id: convId,
              role: "assistant",
              content: textoAcumulado,
              sources: fuentes,
            });
            await sb
              .from("assistant_conversations")
              .update({ updated_at: new Date().toISOString() })
              .eq("id", convId);
          } catch {
            /* el historial no es crítico para la respuesta ya entregada */
          }
        }
        cerrado = true;
        controller.close();
      }
    },
    cancel() {
      ac.abort();
    },
  });

  return new Response(stream, {
    headers: {
      "content-type": "application/x-ndjson; charset=utf-8",
      "cache-control": "no-store, no-transform",
      "x-accel-buffering": "no",
    },
  });
}
