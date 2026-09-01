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
import { usePathname, useRouter } from "next/navigation";
import { usandoSupabase } from "@/lib/repository";
import { getSupabaseClient, getUsuarioActual } from "@/lib/supabase/client";
import {
  moduloDeRuta,
  primeraRutaPermitida,
  resolverPermisos,
  tieneAcceso,
  PERMISOS_COMPLETOS,
  type AccessLevel,
  type MapaPermisos,
  type ModuleKey,
} from "@/lib/permisos";

interface PermisosValor {
  cargando: boolean;
  esAdmin: boolean;
  permisos: MapaPermisos;
  /** ¿El usuario alcanza `minimo` en `modulo`? */
  puede: (modulo: ModuleKey, minimo?: AccessLevel) => boolean;
  recargar: () => Promise<void>;
}

const Ctx = createContext<PermisosValor | null>(null);

export function PermisosProvider({ children }: { children: React.ReactNode }) {
  const esSupabase = useMemo(() => usandoSupabase(), []);
  const router = useRouter();
  const pathname = usePathname();
  const montado = useRef(true);

  const [cargando, setCargando] = useState(esSupabase);
  const [esAdmin, setEsAdmin] = useState(!esSupabase); // modo local: todo permitido
  const [permisos, setPermisos] = useState<MapaPermisos>({
    ...PERMISOS_COMPLETOS,
  });

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    if (!esSupabase) {
      setCargando(false);
      return;
    }
    setCargando(true);
    try {
      const sb = getSupabaseClient();
      const u = await getUsuarioActual();
      if (!u) {
        setCargando(false);
        return;
      }
      const [perfilRes, permsRes] = await Promise.all([
        sb
          .from("perfiles")
          .select("rol_general, rol")
          .eq("user_id", u.id)
          .maybeSingle(),
        sb
          .from("user_module_permissions")
          .select("module_key, access_level")
          .eq("user_id", u.id),
      ]);
      if (!montado.current) return;
      const admin =
        perfilRes.data?.rol_general === "admin" ||
        perfilRes.data?.rol === "admin";
      setEsAdmin(admin);
      setPermisos(resolverPermisos(permsRes.data ?? [], admin));
      void sb.rpc("registrar_acceso");
    } catch {
      /* si falla, no bloquear la app: se mantiene el estado previo */
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [esSupabase]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // Realtime: si cambian mis permisos, recargar y sacar de la página si aplica.
  useEffect(() => {
    if (!esSupabase) return;
    let cancelado = false;
    const sb = getSupabaseClient();
    let canal: ReturnType<typeof sb.channel> | null = null;
    void getUsuarioActual().then((u) => {
      if (cancelado || !u) return;
      canal = sb
        .channel("permisos-usuario")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_module_permissions",
            filter: `user_id=eq.${u.id}`,
          },
          () => void cargar(),
        )
        .subscribe();
    });
    return () => {
      cancelado = true;
      if (canal) void sb.removeChannel(canal);
    };
  }, [esSupabase, cargar]);

  // Expulsión de la ruta si se perdió el acceso mientras estaba dentro.
  useEffect(() => {
    if (cargando || esAdmin) return;
    const modulo = moduloDeRuta(pathname);
    if (modulo && !tieneAcceso(permisos[modulo], "view")) {
      router.replace(primeraRutaPermitida(permisos));
    }
  }, [cargando, esAdmin, permisos, pathname, router]);

  const puede = useCallback(
    (modulo: ModuleKey, minimo: AccessLevel = "view") =>
      esAdmin || tieneAcceso(permisos[modulo], minimo),
    [esAdmin, permisos],
  );

  const valor: PermisosValor = {
    cargando,
    esAdmin,
    permisos,
    puede,
    recargar: cargar,
  };

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function usePermisos(): PermisosValor {
  const ctx = useContext(Ctx);
  if (!ctx) {
    throw new Error("usePermisos debe usarse dentro de <PermisosProvider>.");
  }
  return ctx;
}
