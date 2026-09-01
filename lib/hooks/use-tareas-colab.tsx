"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { getFase2Repository, usandoSupabase } from "@/lib/repository";
import { getSupabaseClient, getUsuarioActual } from "@/lib/supabase/client";
import type {
  ActividadTarea,
  ComentarioTarea,
  Subtarea,
} from "@/lib/types";

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Ocurrió un error inesperado.";
}

/**
 * Datos colaborativos de tareas: subtareas, comentarios y actividad, con
 * suscripción Realtime. Se usa solo en la sección /tareas.
 */
export function useTareasColab() {
  const repo = useMemo(() => getFase2Repository(), []);
  const esSupabase = useMemo(() => usandoSupabase(), []);
  const montado = useRef(true);
  const [subtareas, setSubtareas] = useState<Subtarea[]>([]);
  const [comentarios, setComentarios] = useState<ComentarioTarea[]>([]);
  const [actividad, setActividad] = useState<ActividadTarea[]>([]);
  const [miUserId, setMiUserId] = useState<string | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    montado.current = true;
    void getUsuarioActual().then((u) => {
      if (montado.current) setMiUserId(u?.id ?? "local");
    });
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const [s, c, a] = await Promise.all([
        repo.listSubtareas(),
        repo.listComentarios(),
        repo.listActividadTarea(),
      ]);
      if (!montado.current) return;
      setSubtareas(s);
      setComentarios(c);
      setActividad(a);
    } catch (e) {
      toast.error("No se pudo cargar la información de tareas", {
        description: msg(e),
      });
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [repo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Realtime para subtareas / comentarios / actividad.
  useEffect(() => {
    if (!esSupabase) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const refrescar = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void cargar(), 250);
    };
    const sb = getSupabaseClient();
    const canal = sb
      .channel("tareas-colab")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "subtareas" },
        refrescar,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "comentarios_tarea" },
        refrescar,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "actividad_tarea" },
        refrescar,
      )
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      void sb.removeChannel(canal);
    };
  }, [esSupabase, cargar]);

  // ── Subtareas ──
  const crearSubtarea = useCallback(
    async (tareaId: string, titulo: string) => {
      const orden =
        subtareas.filter((s) => s.tareaId === tareaId).length;
      try {
        const s = await repo.crearSubtarea(tareaId, { titulo, orden });
        setSubtareas((prev) => [...prev, s]);
      } catch (e) {
        toast.error("No se pudo agregar la subtarea", { description: msg(e) });
      }
    },
    [repo, subtareas],
  );

  const alternarSubtarea = useCallback(
    async (id: string, completada: boolean) => {
      setSubtareas((prev) =>
        prev.map((s) => (s.id === id ? { ...s, completada } : s)),
      );
      try {
        const s = await repo.actualizarSubtarea(id, { completada });
        setSubtareas((prev) => prev.map((x) => (x.id === id ? s : x)));
      } catch (e) {
        toast.error("No se pudo actualizar la subtarea", {
          description: msg(e),
        });
        void cargar();
      }
    },
    [repo, cargar],
  );

  const eliminarSubtarea = useCallback(
    async (id: string) => {
      setSubtareas((prev) => prev.filter((s) => s.id !== id));
      try {
        await repo.eliminarSubtarea(id);
      } catch (e) {
        toast.error("No se pudo eliminar la subtarea", { description: msg(e) });
        void cargar();
      }
    },
    [repo, cargar],
  );

  // ── Comentarios ──
  const crearComentario = useCallback(
    async (tareaId: string, contenido: string, mencionados: string[] = []) => {
      const limpio = contenido.trim();
      if (!limpio) return;
      try {
        const c = await repo.crearComentario(tareaId, limpio);
        setComentarios((prev) => [...prev, c]);
        for (const uid of mencionados) {
          try {
            await repo.notificarMencion(tareaId, uid);
          } catch {
            /* no bloquea el comentario */
          }
        }
        void cargar();
      } catch (e) {
        toast.error("No se pudo publicar el comentario", {
          description: msg(e),
        });
      }
    },
    [repo, cargar],
  );

  const eliminarComentario = useCallback(
    async (id: string) => {
      setComentarios((prev) => prev.filter((c) => c.id !== id));
      try {
        await repo.eliminarComentario(id);
        void cargar();
      } catch (e) {
        toast.error("No se pudo eliminar el comentario", {
          description: msg(e),
        });
        void cargar();
      }
    },
    [repo, cargar],
  );

  return {
    esSupabase,
    cargando,
    miUserId,
    subtareas,
    comentarios,
    actividad,
    recargar: cargar,
    crearSubtarea,
    alternarSubtarea,
    eliminarSubtarea,
    crearComentario,
    eliminarComentario,
  };
}
