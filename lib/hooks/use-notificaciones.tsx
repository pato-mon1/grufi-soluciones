"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { getFase2Repository, usandoSupabase } from "@/lib/repository";
import { getSupabaseClient } from "@/lib/supabase/client";
import type { Notificacion } from "@/lib/types";

interface NotificacionesValor {
  notificaciones: Notificacion[];
  noLeidas: number;
  cargando: boolean;
  marcarLeida: (id: string) => Promise<void>;
  marcarTodas: () => Promise<void>;
  recargar: () => Promise<void>;
  /** `true` si el navegador concedió permiso para notificaciones. */
  permisoNavegador: boolean;
  pedirPermisoNavegador: () => void;
}

const Ctx = createContext<NotificacionesValor | null>(null);

export function NotificacionesProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const repo = useMemo(() => getFase2Repository(), []);
  const esSupabase = useMemo(() => usandoSupabase(), []);
  const montado = useRef(true);
  const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
  const [cargando, setCargando] = useState(esSupabase);
  const [permisoNavegador, setPermisoNavegador] = useState(false);

  useEffect(() => {
    montado.current = true;
    if (typeof Notification !== "undefined") {
      setPermisoNavegador(Notification.permission === "granted");
    }
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    try {
      const lista = await repo.listNotificaciones();
      if (montado.current) setNotificaciones(lista);
    } catch {
      /* silencioso: la campana no debe romper la app */
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [repo]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Realtime: nuevas notificaciones para este usuario.
  useEffect(() => {
    if (!esSupabase) return;
    const sb = getSupabaseClient();
    const canal = sb
      .channel("notificaciones-usuario")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificaciones" },
        (payload) => {
          const fila = payload.new as Record<string, unknown>;
          const nueva: Notificacion = {
            id: fila.id as string,
            tipo: fila.tipo as string,
            titulo: fila.titulo as string,
            mensaje: (fila.mensaje as string | null) ?? "",
            tareaId: (fila.tarea_id as string | null) ?? null,
            leidaEn: (fila.leida_en as string | null) ?? null,
            fechaCreacion: fila.fecha_creacion as string,
          };
          if (!montado.current) return;
          setNotificaciones((prev) =>
            prev.some((n) => n.id === nueva.id) ? prev : [nueva, ...prev],
          );
          toast(nueva.titulo, { description: nueva.mensaje || undefined });
          if (
            typeof Notification !== "undefined" &&
            Notification.permission === "granted"
          ) {
            try {
              new Notification(nueva.titulo, {
                body: nueva.mensaje || undefined,
              });
            } catch {
              /* algunos navegadores requieren SW; se ignora */
            }
          }
        },
      )
      .subscribe();
    return () => {
      void sb.removeChannel(canal);
    };
  }, [esSupabase]);

  const marcarLeida = useCallback(
    async (id: string) => {
      setNotificaciones((prev) =>
        prev.map((n) =>
          n.id === id
            ? { ...n, leidaEn: n.leidaEn ?? new Date().toISOString() }
            : n,
        ),
      );
      try {
        await repo.marcarNotificacion(id, true);
      } catch {
        void cargar();
      }
    },
    [repo, cargar],
  );

  const marcarTodas = useCallback(async () => {
    const marca = new Date().toISOString();
    setNotificaciones((prev) =>
      prev.map((n) => (n.leidaEn ? n : { ...n, leidaEn: marca })),
    );
    try {
      await repo.marcarTodasNotificaciones();
    } catch {
      void cargar();
    }
  }, [repo, cargar]);

  const pedirPermisoNavegador = useCallback(() => {
    if (typeof Notification === "undefined") return;
    void Notification.requestPermission().then((p) =>
      setPermisoNavegador(p === "granted"),
    );
  }, []);

  const noLeidas = notificaciones.filter((n) => !n.leidaEn).length;

  const valor: NotificacionesValor = {
    notificaciones,
    noLeidas,
    cargando,
    marcarLeida,
    marcarTodas,
    recargar: cargar,
    permisoNavegador,
    pedirPermisoNavegador,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useNotificaciones(): NotificacionesValor {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error(
      "useNotificaciones debe usarse dentro de <NotificacionesProvider>.",
    );
  }
  return ctx;
}
