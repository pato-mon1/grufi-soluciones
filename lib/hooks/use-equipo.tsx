"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { usandoSupabase } from "@/lib/repository";
import { getSupabaseClient, getUsuarioActual } from "@/lib/supabase/client";
import type { Invitacion, MiembroOrg, Organizacion } from "@/lib/equipo";
import {
  MODULOS,
  resolverPermisos,
  type AccessLevel,
  type MapaPermisos,
} from "@/lib/permisos";
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
  /** Permisos por módulo de cada colaborador, indexado por userId. */
  permisosPorUsuario: Record<string, MapaPermisos>;
  miUserId: string | null;
  soyAdmin: boolean;
  /** `true` si el servidor tiene configurada la clave para invitar/dar de alta. */
  altaDisponible: boolean;
  recargar: () => Promise<void>;
  renombrar: (nombre: string) => Promise<void>;
  invitar: (correo: string, rol: RolPerfil) => Promise<void>;
  cancelarInvitacion: (id: string) => Promise<void>;
  cambiarRol: (miembroId: string, rol: RolPerfil) => Promise<void>;
  quitarMiembro: (miembroId: string) => Promise<void>;
  /** Crea (o vincula) una cuenta con contraseña y la añade a la organización. */
  altaUsuario: (
    correo: string,
    password: string,
    rol: RolPerfil,
  ) => Promise<boolean>;
  /** Invita por correo (Supabase Auth) dejando los permisos preparados. */
  invitarColaborador: (datos: {
    correo: string;
    nombre: string;
    puesto: string;
    rolGeneral: string;
    estado: string;
    permisos: MapaPermisos;
  }) => Promise<boolean>;
  /** Guarda el mapa de permisos de un colaborador existente. */
  guardarPermisos: (userId: string, permisos: MapaPermisos) => Promise<void>;
  /** Actualiza nombre/puesto/estado/rol_general de un colaborador. */
  guardarPerfilColaborador: (
    userId: string,
    datos: {
      nombre: string;
      puesto: string;
      estado: string;
      rolGeneral: string;
    },
  ) => Promise<void>;
}

export function useEquipo(): EstadoEquipo {
  const disponible = useMemo(() => usandoSupabase(), []);
  const montado = useRef(true);
  const [cargando, setCargando] = useState(disponible);
  const [procesando, setProcesando] = useState(false);
  const [organizacion, setOrganizacion] = useState<Organizacion | null>(null);
  const [miembros, setMiembros] = useState<MiembroOrg[]>([]);
  const [invitaciones, setInvitaciones] = useState<Invitacion[]>([]);
  const [permisosPorUsuario, setPermisosPorUsuario] = useState<
    Record<string, MapaPermisos>
  >({});
  const [miUserId, setMiUserId] = useState<string | null>(null);
  const [altaDisponible, setAltaDisponible] = useState(false);

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
      const [orgRes, miemRes, invRes, perfRes, permRes] = await Promise.all([
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
        sb
          .from("perfiles")
          .select("user_id, nombre, puesto, estado, rol_general, ultimo_acceso"),
        sb
          .from("user_module_permissions")
          .select("user_id, module_key, access_level"),
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

      const perfPorId = new Map<string, Record<string, unknown>>();
      for (const p of perfRes.data ?? []) {
        perfPorId.set(p.user_id as string, p);
      }
      setMiembros(
        (miemRes.data ?? []).map((m) => {
          const p = perfPorId.get(m.user_id) ?? {};
          return {
            id: m.id,
            orgId: m.org_id,
            userId: m.user_id,
            correo: (m.correo as string) ?? "",
            rol: m.rol as RolPerfil,
            fechaCreacion: m.fecha_creacion,
            nombre: ((p.nombre as string) ?? "").trim(),
            puesto: ((p.puesto as string) ?? "").trim(),
            estado:
              (p.estado as MiembroOrg["estado"]) ??
              (m.rol === "admin" ? "activo" : "activo"),
            rolGeneral:
              (p.rol_general as string) ??
              (m.rol === "admin" ? "admin" : "personalizado"),
            ultimoAcceso: (p.ultimo_acceso as string | null) ?? null,
          };
        }),
      );

      const porUsuario: Record<string, MapaPermisos> = {};
      const filasPorUsuario = new Map<
        string,
        { module_key: string; access_level: string }[]
      >();
      for (const r of permRes.data ?? []) {
        const arr = filasPorUsuario.get(r.user_id as string) ?? [];
        arr.push({
          module_key: r.module_key as string,
          access_level: r.access_level as string,
        });
        filasPorUsuario.set(r.user_id as string, arr);
      }
      for (const m of miemRes.data ?? []) {
        const esAdminM = (m.rol as string) === "admin";
        porUsuario[m.user_id] = resolverPermisos(
          filasPorUsuario.get(m.user_id) ?? [],
          esAdminM,
        );
      }
      setPermisosPorUsuario(porUsuario);
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

      try {
        const r = await fetch("/api/equipo/alta", { method: "GET" });
        if (r.ok) {
          const j = (await r.json()) as { disponible?: boolean };
          if (montado.current) setAltaDisponible(Boolean(j.disponible));
        }
      } catch {
        /* si el endpoint no responde, el alta queda oculta */
      }
    } catch (e) {
      toast.error("No se pudo cargar el equipo", { description: msg(e) });
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [disponible]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Realtime: refresca la tabla de colaboradores ante cambios de permisos/perfiles.
  useEffect(() => {
    if (!disponible) return;
    let t: ReturnType<typeof setTimeout> | null = null;
    const refrescar = () => {
      if (t) clearTimeout(t);
      t = setTimeout(() => void cargar(), 300);
    };
    const sb = getSupabaseClient();
    const canal = sb
      .channel("equipo-permisos")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_module_permissions" },
        refrescar,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "perfiles" },
        refrescar,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "miembros_organizacion" },
        refrescar,
      )
      .subscribe();
    return () => {
      if (t) clearTimeout(t);
      void sb.removeChannel(canal);
    };
  }, [disponible, cargar]);

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

  const altaUsuario = useCallback(
    async (correo: string, password: string, rol: RolPerfil) => {
      setProcesando(true);
      try {
        const r = await fetch("/api/equipo/alta", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ correo, password, rol }),
        });
        const j = (await r.json().catch(() => ({}))) as {
          ok?: boolean;
          creada?: boolean;
          error?: string;
        };
        if (!r.ok || !j.ok) {
          throw new Error(j.error ?? "No se pudo dar de alta la cuenta.");
        }
        toast.success(
          j.creada
            ? "Cuenta creada y añadida a la organización"
            : "La cuenta ya existía; se añadió a la organización",
        );
        await cargar();
        return true;
      } catch (e) {
        toast.error("No se pudo dar de alta", { description: msg(e) });
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [cargar],
  );

  const invitarColaborador = useCallback(
    async (datos: {
      correo: string;
      nombre: string;
      puesto: string;
      rolGeneral: string;
      estado: string;
      permisos: MapaPermisos;
    }) => {
      setProcesando(true);
      try {
        const r = await fetch("/api/equipo/invitar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(datos),
        });
        const j = (await r.json().catch(() => ({}))) as {
          ok?: boolean;
          invitada?: boolean;
          error?: string;
        };
        if (!r.ok || !j.ok) {
          throw new Error(j.error ?? "No se pudo enviar la invitación.");
        }
        toast.success(
          j.invitada
            ? "Invitación enviada por correo"
            : "La persona ya tenía cuenta; se actualizaron sus permisos",
        );
        await cargar();
        return true;
      } catch (e) {
        toast.error("No se pudo invitar", { description: msg(e) });
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [cargar],
  );

  const guardarPermisos = useCallback(
    (userId: string, permisos: MapaPermisos) =>
      conProceso(async () => {
        const sb = getSupabaseClient();
        const orgId = organizacion?.id ?? null;
        const filas = MODULOS.map((m) => ({
          user_id: userId,
          org_id: orgId,
          module_key: m,
          access_level: permisos[m] as AccessLevel,
        }));
        const { error } = await sb
          .from("user_module_permissions")
          .upsert(filas, { onConflict: "user_id,module_key" });
        if (error) throw new Error(error.message);
      }, "Permisos actualizados"),
    [conProceso, organizacion],
  );

  const guardarPerfilColaborador = useCallback(
    (
      userId: string,
      datos: {
        nombre: string;
        puesto: string;
        estado: string;
        rolGeneral: string;
      },
    ) =>
      conProceso(async () => {
        const { error } = await getSupabaseClient()
          .from("perfiles")
          .update({
            nombre: datos.nombre.trim(),
            puesto: datos.puesto.trim(),
            estado: datos.estado,
            rol_general: datos.rolGeneral,
          })
          .eq("user_id", userId);
        if (error) throw new Error(error.message);
      }, "Datos del colaborador actualizados"),
    [conProceso],
  );

  return {
    disponible,
    cargando,
    procesando,
    organizacion,
    miembros,
    invitaciones,
    permisosPorUsuario,
    miUserId,
    soyAdmin,
    altaDisponible,
    recargar: cargar,
    renombrar,
    invitar,
    cancelarInvitacion,
    cambiarRol,
    quitarMiembro,
    altaUsuario,
    invitarColaborador,
    guardarPermisos,
    guardarPerfilColaborador,
  };
}
