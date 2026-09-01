"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { usandoSupabase } from "@/lib/repository";
import { getSupabaseClient } from "@/lib/supabase/client";
import {
  ERR_ASISTENTE,
  type ConversacionChat,
  type EventoAsistente,
  type FuenteConsultada,
  type MensajeChat,
} from "@/lib/asistente/tipos";

/** Id temporal para mensajes optimistas (se reemplaza por el id real de la BD). */
function uid(): string {
  return `tmp-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const MENSAJE_ERROR: Record<string, string> = {
  [ERR_ASISTENTE.SIN_SESION]: "Tu sesión expiró. Vuelve a iniciar sesión.",
  [ERR_ASISTENTE.IA_NO_CONFIGURADA]:
    "El Asistente GRUFI necesita configurar el proveedor de inteligencia artificial.",
  [ERR_ASISTENTE.SIN_ACCESO]:
    "No tienes acceso al Asistente GRUFI. Pídeselo a un administrador.",
  [ERR_ASISTENTE.LIMITE]:
    "Alcanzaste el límite de preguntas por hora. Intenta de nuevo más tarde.",
  [ERR_ASISTENTE.MENSAJE_INVALIDO]: "Escribe una pregunta más corta.",
  [ERR_ASISTENTE.TIEMPO_AGOTADO]:
    "La consulta tardó demasiado. Intenta acotar la pregunta.",
  [ERR_ASISTENTE.INTERNO]: "No se pudo completar la respuesta. Intenta de nuevo.",
};

export interface EstadoAsistente {
  disponible: boolean;
  iaConfigurada: boolean | null;
  conversaciones: ConversacionChat[];
  activaId: string | null;
  mensajes: MensajeChat[];
  cargandoLista: boolean;
  cargandoMensajes: boolean;
  enviando: boolean;
  progreso: null | "consultando" | "redactando";
  nueva: () => void;
  seleccionar: (id: string) => Promise<void>;
  enviar: (texto: string) => Promise<void>;
  cancelar: () => void;
  renombrar: (id: string, titulo: string) => Promise<void>;
  eliminar: (id: string) => Promise<void>;
  valorar: (mensajeId: string, valor: 1 | -1) => Promise<void>;
}

export function useAsistente(): EstadoAsistente {
  const disponible = useMemo(() => usandoSupabase(), []);
  const montado = useRef(true);
  const abortRef = useRef<AbortController | null>(null);

  const [iaConfigurada, setIaConfigurada] = useState<boolean | null>(null);
  const [conversaciones, setConversaciones] = useState<ConversacionChat[]>([]);
  const [activaId, setActivaId] = useState<string | null>(null);
  const [mensajes, setMensajes] = useState<MensajeChat[]>([]);
  const [cargandoLista, setCargandoLista] = useState(disponible);
  const [cargandoMensajes, setCargandoMensajes] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [progreso, setProgreso] = useState<null | "consultando" | "redactando">(
    null,
  );

  const mensajesRef = useRef<MensajeChat[]>([]);
  useEffect(() => {
    mensajesRef.current = mensajes;
  }, [mensajes]);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
      abortRef.current?.abort();
    };
  }, []);

  const cargarLista = useCallback(async () => {
    if (!disponible) {
      setCargandoLista(false);
      return;
    }
    setCargandoLista(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from("assistant_conversations")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);
      if (error) throw new Error(error.message);
      if (!montado.current) return;
      setConversaciones(
        (data ?? []).map((c) => ({
          id: c.id as string,
          title: (c.title as string) || "Nueva conversación",
          createdAt: c.created_at as string,
          updatedAt: c.updated_at as string,
        })),
      );
    } catch {
      /* la lista no es crítica */
    } finally {
      if (montado.current) setCargandoLista(false);
    }
  }, [disponible]);

  useEffect(() => {
    void cargarLista();
  }, [cargarLista]);

  useEffect(() => {
    if (!disponible) return;
    let vivo = true;
    void fetch("/api/assistant/chat", { method: "GET" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j: { iaConfigurada?: boolean } | null) => {
        if (vivo && j) setIaConfigurada(Boolean(j.iaConfigurada));
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [disponible]);

  const nueva = useCallback(() => {
    abortRef.current?.abort();
    setActivaId(null);
    setMensajes([]);
    setProgreso(null);
  }, []);

  const seleccionar = useCallback(async (id: string) => {
    abortRef.current?.abort();
    setActivaId(id);
    setMensajes([]);
    setCargandoMensajes(true);
    try {
      const { data, error } = await getSupabaseClient()
        .from("assistant_messages")
        .select("id, role, content, sources, feedback, created_at")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      if (error) throw new Error(error.message);
      if (!montado.current) return;
      setMensajes(
        (data ?? []).map((m) => ({
          id: m.id as string,
          role: (m.role as "user" | "assistant") ?? "assistant",
          content: (m.content as string) ?? "",
          sources: (m.sources as FuenteConsultada[] | null) ?? [],
          feedback: (m.feedback as -1 | 1 | null) ?? null,
          createdAt: m.created_at as string,
        })),
      );
    } catch (e) {
      toast.error("No se pudo abrir la conversación", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      if (montado.current) setCargandoMensajes(false);
    }
  }, []);

  /** Cambia los ids temporales por los reales (para feedback y consistencia). */
  const refrescarMensajes = useCallback(
    async (convId: string, idUsuarioTmp: string, idRespuestaTmp: string) => {
      try {
        const { data } = await getSupabaseClient()
          .from("assistant_messages")
          .select("id, role, content, sources, feedback, created_at")
          .eq("conversation_id", convId)
          .order("created_at", { ascending: true });
        if (!data || !montado.current) return;
        const reales = data.map((m) => ({
          id: m.id as string,
          role: (m.role as "user" | "assistant") ?? "assistant",
          content: (m.content as string) ?? "",
          sources: (m.sources as FuenteConsultada[] | null) ?? [],
          feedback: (m.feedback as -1 | 1 | null) ?? null,
          createdAt: m.created_at as string,
        }));
        setMensajes((prev) => {
          const tieneTmp = prev.some(
            (m) => m.id === idUsuarioTmp || m.id === idRespuestaTmp,
          );
          return tieneTmp && reales.length >= prev.length ? reales : prev;
        });
      } catch {
        /* no crítico */
      }
    },
    [],
  );

  const enviar = useCallback(
    async (texto: string) => {
      const pregunta = texto.trim();
      if (!pregunta || enviando) return;

      const idUsuario = uid();
      const idRespuesta = uid();
      const ahora = new Date().toISOString();
      setMensajes((prev) => [
        ...prev,
        {
          id: idUsuario,
          role: "user",
          content: pregunta,
          createdAt: ahora,
        },
        {
          id: idRespuesta,
          role: "assistant",
          content: "",
          sources: [],
          createdAt: ahora,
          streaming: true,
        },
      ]);
      setEnviando(true);
      setProgreso("consultando");

      const ac = new AbortController();
      abortRef.current = ac;

      const marcarError = (code: string) => {
        setMensajes((prev) =>
          prev.map((m) =>
            m.id === idRespuesta
              ? {
                  ...m,
                  streaming: false,
                  error: true,
                  content:
                    m.content ||
                    MENSAJE_ERROR[code] ||
                    MENSAJE_ERROR[ERR_ASISTENTE.INTERNO],
                }
              : m,
          ),
        );
      };

      try {
        const res = await fetch("/api/assistant/chat", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ conversationId: activaId, mensaje: pregunta }),
          signal: ac.signal,
        });

        if (!res.ok || !res.body) {
          let code = ERR_ASISTENTE.INTERNO;
          try {
            const j = (await res.json()) as { error?: string };
            if (j.error) code = j.error;
          } catch {
            /* sin cuerpo */
          }
          marcarError(code);
          if (code === ERR_ASISTENTE.IA_NO_CONFIGURADA) setIaConfigurada(false);
          return;
        }

        const lector = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let convId = activaId;

        const aplicar = (ev: EventoAsistente) => {
          if (ev.t === "meta") {
            convId = ev.conversationId;
            if (!activaId) setActivaId(ev.conversationId);
            setConversaciones((prev) => {
              const resto = prev.filter((c) => c.id !== ev.conversationId);
              return [
                {
                  id: ev.conversationId,
                  title: ev.title,
                  createdAt: ahora,
                  updatedAt: new Date().toISOString(),
                },
                ...resto,
              ];
            });
          } else if (ev.t === "estado") {
            setProgreso(ev.v);
          } else if (ev.t === "delta") {
            setProgreso("redactando");
            setMensajes((prev) =>
              prev.map((m) =>
                m.id === idRespuesta
                  ? { ...m, content: m.content + ev.v }
                  : m,
              ),
            );
          } else if (ev.t === "fuentes") {
            setMensajes((prev) =>
              prev.map((m) =>
                m.id === idRespuesta ? { ...m, sources: ev.v } : m,
              ),
            );
          } else if (ev.t === "fin") {
            setMensajes((prev) =>
              prev.map((m) =>
                m.id === idRespuesta ? { ...m, streaming: false } : m,
              ),
            );
          } else if (ev.t === "error") {
            marcarError(ev.code);
          }
        };

        for (;;) {
          const { done, value } = await lector.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lineas = buffer.split("\n");
          buffer = lineas.pop() ?? "";
          for (const linea of lineas) {
            const limpia = linea.trim();
            if (!limpia) continue;
            try {
              aplicar(JSON.parse(limpia) as EventoAsistente);
            } catch {
              /* línea incompleta o no-JSON */
            }
          }
        }

        setMensajes((prev) =>
          prev.map((m) =>
            m.id === idRespuesta ? { ...m, streaming: false } : m,
          ),
        );
        // Recarga los IDs reales de los mensajes recién guardados.
        if (convId) void refrescarMensajes(convId, idUsuario, idRespuesta);
      } catch (e) {
        if ((e as Error)?.name === "AbortError") {
          setMensajes((prev) =>
            prev.map((m) =>
              m.id === idRespuesta ? { ...m, streaming: false } : m,
            ),
          );
        } else {
          marcarError(ERR_ASISTENTE.INTERNO);
        }
      } finally {
        if (montado.current) {
          setEnviando(false);
          setProgreso(null);
        }
        abortRef.current = null;
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activaId, enviando, refrescarMensajes],
  );

  const cancelar = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const renombrar = useCallback(async (id: string, titulo: string) => {
    const limpio = titulo.trim().slice(0, 80);
    if (!limpio) return;
    setConversaciones((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: limpio } : c)),
    );
    const { error } = await getSupabaseClient()
      .from("assistant_conversations")
      .update({ title: limpio })
      .eq("id", id);
    if (error) toast.error("No se pudo renombrar", { description: error.message });
  }, []);

  const eliminar = useCallback(
    async (id: string) => {
      const { error } = await getSupabaseClient()
        .from("assistant_conversations")
        .delete()
        .eq("id", id);
      if (error) {
        toast.error("No se pudo eliminar", { description: error.message });
        return;
      }
      setConversaciones((prev) => prev.filter((c) => c.id !== id));
      if (activaId === id) {
        setActivaId(null);
        setMensajes([]);
      }
      toast.success("Conversación eliminada");
    },
    [activaId],
  );

  const valorar = useCallback(
    async (mensajeId: string, valor: 1 | -1) => {
      if (mensajeId.startsWith("tmp-")) return;
      const actual = mensajesRef.current.find((m) => m.id === mensajeId)?.feedback;
      const destino: 1 | -1 | null = actual === valor ? null : valor;
      setMensajes((prev) =>
        prev.map((m) =>
          m.id === mensajeId ? { ...m, feedback: destino } : m,
        ),
      );
      try {
        await getSupabaseClient()
          .from("assistant_messages")
          .update({ feedback: destino })
          .eq("id", mensajeId);
      } catch {
        /* el feedback es opcional; si falla no interrumpe la conversación */
      }
    },
    [],
  );

  return {
    disponible,
    iaConfigurada,
    conversaciones,
    activaId,
    mensajes,
    cargandoLista,
    cargandoMensajes,
    enviando,
    progreso,
    nueva,
    seleccionar,
    enviar,
    cancelar,
    renombrar,
    eliminar,
    valorar,
  };
}
