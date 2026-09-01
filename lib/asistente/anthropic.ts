import "server-only";

/**
 * Proveedor de IA para el Asistente GRUFI.
 *
 * Arquitectura intercambiable: el resto del código solo depende de la interfaz
 * `ProveedorIA`. Hoy hay una implementación (Anthropic vía API REST, sin SDK
 * para no sumar dependencias de build). Para cambiar de proveedor basta con
 * crear otro objeto que cumpla `ProveedorIA` y exponerlo en `obtenerProveedor`.
 *
 * Las llaves viven SOLO en el servidor (`ANTHROPIC_API_KEY`, `AI_MODEL`). Nunca
 * se exponen con prefijo NEXT_PUBLIC ni se envían al navegador.
 */

export interface BloqueTexto {
  type: "text";
  text: string;
}
export interface BloqueUsoHerramienta {
  type: "tool_use";
  id: string;
  name: string;
  input: unknown;
}
export type BloqueContenido = BloqueTexto | BloqueUsoHerramienta;

/** Bloque de resultado de herramienta que se devuelve al modelo. */
export interface BloqueResultadoHerramienta {
  type: "tool_result";
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface MensajeIA {
  role: "user" | "assistant";
  content: string | Array<BloqueContenido | BloqueResultadoHerramienta>;
}

export interface DefinicionHerramientaIA {
  name: string;
  description: string;
  input_schema: Record<string, unknown>;
}

export interface OpcionesStream {
  system: string;
  messages: MensajeIA[];
  tools: DefinicionHerramientaIA[];
  maxTokens?: number;
  signal?: AbortSignal;
}

export type EventoProveedor =
  | { tipo: "texto"; texto: string }
  | { tipo: "fin"; contenido: BloqueContenido[]; stopReason: string | null };

export interface ProveedorIA {
  readonly nombre: string;
  configurado(): boolean;
  stream(opts: OpcionesStream): AsyncGenerator<EventoProveedor, void, unknown>;
}

const API_URL = "https://api.anthropic.com/v1/messages";
const VERSION = "2023-06-01";
const MODELO_POR_DEFECTO = "claude-sonnet-4-5";

function apiKey(): string {
  return process.env.ANTHROPIC_API_KEY ?? "";
}
function modelo(): string {
  return process.env.AI_MODEL?.trim() || MODELO_POR_DEFECTO;
}

/** Procesa un stream SSE de Anthropic y emite eventos normalizados. */
async function* leerSse(
  respuesta: Response,
): AsyncGenerator<EventoProveedor, void, unknown> {
  const cuerpo = respuesta.body;
  if (!cuerpo) throw new Error("Respuesta sin cuerpo del proveedor de IA.");

  const lector = cuerpo.getReader();
  const decodificador = new TextDecoder();
  let buffer = "";

  // Ensamblado de la respuesta por índice de bloque.
  const bloques: Array<{
    type: "text" | "tool_use";
    text: string;
    id?: string;
    name?: string;
    jsonParcial: string;
  }> = [];
  let stopReason: string | null = null;

  const procesarEvento = function* (
    payload: string,
  ): Generator<EventoProveedor, void, unknown> {
    let evento: {
      type?: string;
      index?: number;
      delta?: {
        type?: string;
        text?: string;
        partial_json?: string;
        stop_reason?: string;
      };
      content_block?: {
        type?: string;
        id?: string;
        name?: string;
      };
      error?: { message?: string };
    };
    try {
      evento = JSON.parse(payload);
    } catch {
      return;
    }
    switch (evento.type) {
      case "content_block_start": {
        const i = evento.index ?? bloques.length;
        bloques[i] = {
          type: evento.content_block?.type === "tool_use" ? "tool_use" : "text",
          text: "",
          id: evento.content_block?.id,
          name: evento.content_block?.name,
          jsonParcial: "",
        };
        break;
      }
      case "content_block_delta": {
        const i = evento.index ?? 0;
        const b = bloques[i];
        if (!b) break;
        if (evento.delta?.type === "text_delta" && evento.delta.text) {
          b.text += evento.delta.text;
          yield { tipo: "texto", texto: evento.delta.text };
        } else if (
          evento.delta?.type === "input_json_delta" &&
          typeof evento.delta.partial_json === "string"
        ) {
          b.jsonParcial += evento.delta.partial_json;
        }
        break;
      }
      case "message_delta": {
        if (evento.delta?.stop_reason) stopReason = evento.delta.stop_reason;
        break;
      }
      case "error": {
        throw new Error(
          evento.error?.message ?? "Error del proveedor de IA durante el stream.",
        );
      }
      default:
        break;
    }
  };

  try {
    for (;;) {
      const { done, value } = await lector.read();
      if (done) break;
      buffer += decodificador.decode(value, { stream: true });
      const trozos = buffer.split("\n\n");
      buffer = trozos.pop() ?? "";
      for (const trozo of trozos) {
        for (const linea of trozo.split("\n")) {
          const limpia = linea.trim();
          if (!limpia.startsWith("data:")) continue;
          const payload = limpia.slice(5).trim();
          if (!payload || payload === "[DONE]") continue;
          yield* procesarEvento(payload);
        }
      }
    }
  } finally {
    lector.releaseLock();
  }

  const contenido: BloqueContenido[] = bloques
    .filter(Boolean)
    .map((b) => {
      if (b.type === "tool_use") {
        let input: unknown = {};
        try {
          input = b.jsonParcial ? JSON.parse(b.jsonParcial) : {};
        } catch {
          input = {};
        }
        return {
          type: "tool_use" as const,
          id: b.id ?? "",
          name: b.name ?? "",
          input,
        };
      }
      return { type: "text" as const, text: b.text };
    });

  yield { tipo: "fin", contenido, stopReason };
}

const proveedorAnthropic: ProveedorIA = {
  nombre: "anthropic",
  configurado() {
    return Boolean(apiKey());
  },
  async *stream(opts) {
    if (!apiKey()) throw new Error("IA_NO_CONFIGURADA");
    const respuesta = await fetch(API_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey(),
        "anthropic-version": VERSION,
      },
      body: JSON.stringify({
        model: modelo(),
        max_tokens: opts.maxTokens ?? 1024,
        stream: true,
        system: opts.system,
        messages: opts.messages,
        tools: opts.tools.length > 0 ? opts.tools : undefined,
      }),
      signal: opts.signal,
      cache: "no-store",
    });

    if (!respuesta.ok || !respuesta.body) {
      let detalle = `HTTP ${respuesta.status}`;
      try {
        const j = (await respuesta.json()) as { error?: { message?: string } };
        if (j.error?.message) detalle = j.error.message;
      } catch {
        /* cuerpo no-JSON */
      }
      throw new Error(`El proveedor de IA respondió con un error: ${detalle}`);
    }

    yield* leerSse(respuesta);
  },
};

/** Devuelve el proveedor activo (según configuración del servidor). */
export function obtenerProveedor(): ProveedorIA {
  return proveedorAnthropic;
}

/** `true` si el servidor tiene configurado el proveedor de IA. */
export function proveedorConfigurado(): boolean {
  return obtenerProveedor().configurado();
}

/** Nombre del modelo en uso (para diagnóstico, sin exponer llaves). */
export function modeloEnUso(): string {
  return modelo();
}
