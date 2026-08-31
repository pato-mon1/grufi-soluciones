"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usandoSupabase } from "@/lib/repository";
import { getSupabaseClient, getUsuarioActual } from "@/lib/supabase/client";
import type { Invitacion, MiembroOrg, Organizacion } from "@/lib/equipo";
import type { RolPerfil } from "@/lib/types";

function msg(e: unknown): string {
  return e instanceof Error ? e.message : "Ocurrió un error inesperado.";
}

interface EstadoEquipo {
  disponible: boolean; // false en modo local
  cargando: boolean;
  procesando: boolean;
  organizacion: Organizacion | null;
  miembros: MiembroOrg[];
  invitaciones: Invitacion[];
  miUserId: string | null;
  soyAdmin: boolean;
  recargar: () => Promise<void>;
  renombrar: (nombre: string) => Promise<void>;
  invitar: (correo: string, rol: RolPerfil) => Promise<void>;
  cancelarInvitacion: (id: string) => Promise<void>;
  cambiarRol: (miembroId: string, rol: RolPerfil) => Promise<void>;
  quitarMiembro: (miembroId: string) => Promise<void>;
}

export function useEquipo(): EstadoEquipo {
  const disponible = useMemo(() => usandoSupabase(), []);
  const montado = useRef(true);
  const [cargando, setCargando] = useState(disponible);
  const [procesando, setProcesando] = useState(false);
  const [organizacion, setOrganizacion] = useState<Organizacion | null>(null);
  const [miembros, setMiembros] = useState<MiembroOrg[]>([]);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [miUserId, setMiUserId] = useState<string | null>(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!disponible) {
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const sb = getSupabaseClient();
      // Garantiza que el usuario tenga organización y acepta invitaciones.
      await sb.rpc("asegurar_organizacion");
      await sb.rpc("aceptar_invitaciones");

      const u = await getUsuarioActual();
      const [orgRes, miemRes, invRes] = await Promise.all([
        sb
          .from("organizaciones")
          .select("id, nombre, creada_por, fecha_creacion")
          .order("fecha_creacion", { ascending: true })
          .limit(1)
          .maybeSingle(),
        sb
          .from("miembros_organizacion")
          .select("id, org_id, user_id, correo, rol, fecha_creacion")
          .order("fecha_creacion", { ascending: true }),
        sb
          .from("invitaciones")
          .select("id, org_id, correo, rol, estado, fecha_creacion")
          .eq("estado", "pendiente")
          .order("fecha_creacion", { ascending: false }),
      ]);

      if (!montado.current) return;
      setMiUserId(u?.id ?? null);
      if (orgRes.data) {
        setOrganizacion({
          id: orgRes.data.id,
          nombre: orgRes.data.nombre,
          creadaPor: orgRes.data.creada_por,
          fechaCreacion: orgRes.data.fecha_creacion,
        });
      }
      setMiembros(
        (miemRes.data ?? []).map((m) => ({
          id: m.id,
          orgId: m.org_id,
          userId: m.user_id,
          correo: m.correo ?? "",
          rol: m.rol as RolPerfil,
          fechaCreacion: m.fecha_creacion,
        })),
      );
      setInvitaciones(
        (invRes.data ?? []).map((i) => ({
          id: i.id,
          orgId: i.org_id,
          correo: i.correo,
          rol: i.rol as RolPerfil,
          estado: i.estado as Invitacion["estado"],
          fechaCreacion: i.fecha_creacion,
        })),
      );
    } catch (e) {
      toast.error("No se pudo cargar el equipo", { description: msg(e) });
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [disponible]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  const soyAdmin = useMemo(
    () =>
      miembros.some((m) => m.userId === miUserId && m.rol === "admin") ||
      miembros.length === 0,
    [miembros, miUserId],
  );

  const conProceso = useCallback(
    async (fn: () => Promise<void>, exito: string) => {
      setProcesando(true);
      try {
        await fn();
        toast.success(exito);
        await cargar();
      } catch (e) {
        toast.error("No se pudo completar la acción", { description: msg(e) });
      } finally {
        setProcesando(false);
      }
    },
    [cargar],
  );

  const renombrar = useCallback(
    (nombre: string) =>
      conProceso(async () => {
        if (!organizacion) throw new Error("Sin organización.");
        const { error } = await getSupabaseClient()
          .from("organizaciones")
          .update({ nombre: nombre.trim() })
          .eq("id", organizacion.id);
        if (error) throw new Error(error.message);
      }, "Nombre de la organización actualizado"),
    [conProceso, organizacion],
  );

  const invitar = useCallback(
    (correo: string, rol: RolPerfil) =>
      conProceso(async () => {
        if (!organizacion) throw new Error("Sin organización.");
        const limpio = correo.trim().toLowerCase();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpio)) {
          throw new Error("Escribe un correo válido.");
        }
        if (miembros.some((m) => m.correo.toLowerCase() === limpio)) {
          throw new Error("Esa persona ya es miembro.");
        }
        const { error } = await getSupabaseClient()
          .from("invitaciones")
          .insert({ org_id: organizacion.id, correo: limpio, rol });
        if (error) throw new Error(error.message);
      }, "Invitación creada"),
    [conProceso, organizacion, miembros],
  );

  const cancelarInvitacion = useCallback(
    (id: string) =>
      conProceso(async () => {
        const { error } = await getSupabaseClient()
          .from("invitaciones")
          .update({ estado: "cancelada" })
          .eq("id", id);
        if (error) throw new Error(error.message);
      }, "Invitación cancelada"),
    [conProceso],
  );

  const cambiarRol = useCallback(
    (miembroId: string, rol: RolPerfil) =>
      conProceso(async () => {
        const { error } = await getSupabaseClient()
          .from("miembros_organizacion")
          .update({ rol })
          .eq("id", miembroId);
        if (error) throw new Error(error.message);
      }, "Rol actualizado"),
    [conProceso],
  );

  const quitarMiembro = useCallback(
    (miembroId: string) =>
      conProceso(async () => {
        const { error } = await getSupabaseClient()
          .from("miembros_organizacion")
          .delete()
          .eq("id", miembroId);
        if (error) throw new Error(error.message);
      }, "Miembro quitado de la organización"),
    [conProceso],
  );

  return {
    disponible,
    cargando,
    procesando,
    organizacion,
    miembros,
    invitaciones,
    miUserId,
    soyAdmin,
    recargar: cargar,
    renombrar,
    invitar,
    cancelarInvitacion,
    cambiarRol,
    quitarMiembro,
  };
}
