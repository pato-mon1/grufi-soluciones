import "server-only";

import {
  obtenerProveedor,
  type BloqueContenido,
  type BloqueResultadoHerramienta,
  type MensajeIA,
} from "@/lib/asistente/anthropic";
import {
  definicionesIA,
  ejecutarHerramienta,
  type ContextoHerramienta,
} from "@/lib/asistente/herramientas";
import type { EventoAsistente, FuenteConsultada } from "@/lib/asistente/tipos";

const MAX_ITERS = 5;
const LIMITE_RESULTADO = 12_000;

function esUso(
  b: BloqueContenido,
): b is Extract<BloqueContenido, { type: "tool_use" }> {
  return b.type === "tool_use";
}

/**
 * Ejecuta el bucle "intención → herramientas → respuesta".
 * - Solo ofrece al modelo las herramientas permitidas por los permisos.
 * - El modelo nunca ejecuta SQL: solo llama herramientas validadas.
 * - Transmite el texto por `emitir({ t: "delta" })` y al final las fuentes.
 */
export async function correrAsistente(opts: {
  historial: MensajeIA[];
  system: string;
  ctx: ContextoHerramienta;
  signal?: AbortSignal;
  emitir: (e: EventoAsistente) => void;
}): Promise<{ texto: string; fuentes: FuenteConsultada[] }> {
  const proveedor = obtenerProveedor();
  const tools = definicionesIA(opts.ctx.permisos, opts.ctx.esAdmin);
  const mensajes: MensajeIA[] = [...opts.historial];
  const fuentes: FuenteConsultada[] = [];
  let textoFinal = "";
  let cerrado = false;

  for (let i = 0; i < MAX_ITERS && !cerrado; i++) {
    if (opts.signal?.aborted) break;

    let contenido: BloqueContenido[] = [];
    let stopReason: string | null = null;
    let textoTurno = "";

    for await (const ev of proveedor.stream({
      system: opts.system,
      messages: mensajes,
      tools,
      signal: opts.signal,
      maxTokens: 1024,
    })) {
      if (ev.tipo === "texto") {
        textoTurno += ev.texto;
        opts.emitir({ t: "delta", v: ev.texto });
      } else {
        contenido = ev.contenido;
        stopReason = ev.stopReason;
      }
    }

    // Anthropic rechaza bloques de texto vacíos en el turno del asistente.
    const contenidoLimpio = contenido.filter(
      (b) => b.type !== "text" || b.text.trim().length > 0,
    );

    if (contenidoLimpio.length === 0) {
      textoFinal = textoTurno;
      cerrado = true;
      break;
    }

    mensajes.push({ role: "assistant", content: contenidoLimpio });

    if (stopReason !== "tool_use") {
      textoFinal = textoTurno;
      cerrado = true;
      break;
    }

    opts.emitir({ t: "estado", v: "consultando" });
    const usos = contenido.filter(esUso);
    const resultados: BloqueResultadoHerramienta[] = [];
    for (const uso of usos) {
      if (opts.signal?.aborted) break;
      const out = await ejecutarHerramienta(uso.name, uso.input, opts.ctx);
      for (const f of out.fuentes) fuentes.push(f);
      resultados.push({
        type: "tool_result",
        tool_use_id: uso.id,
        content: JSON.stringify(
          out.ok ? (out.datos ?? {}) : { error: out.error },
        ).slice(0, LIMITE_RESULTADO),
        is_error: !out.ok,
      });
    }
    mensajes.push({ role: "user", content: resultados });
    if (opts.signal?.aborted) break;
    opts.emitir({ t: "estado", v: "redactando" });
  }

  // Si se agotaron las iteraciones sin respuesta final, forzar un cierre.
  if (!cerrado && !opts.signal?.aborted) {
    mensajes.push({
      role: "user",
      content:
        "Redacta ahora la respuesta final para el usuario con la información que ya obtuviste. No llames más herramientas.",
    });
    for await (const ev of proveedor.stream({
      system: opts.system,
      messages: mensajes,
      tools: [],
      signal: opts.signal,
      maxTokens: 1024,
    })) {
      if (ev.tipo === "texto") {
        textoFinal += ev.texto;
        opts.emitir({ t: "delta", v: ev.texto });
      }
    }
  }

  const vistos = new Set<string>();
  const dedup = fuentes
    .filter((f) => {
      const k = `${f.tipo}|${f.href}|${f.etiqueta}`;
      if (vistos.has(k)) return false;
      vistos.add(k);
      return true;
    })
    .slice(0, 12);

  opts.emitir({ t: "fuentes", v: dedup });
  return { texto: textoFinal, fuentes: dedup };
}
