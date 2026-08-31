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
import { getUsuarioActual } from "@/lib/supabase/client";
import {
  resolverEstados,
  type EstadoOportunidad,
  type EstadoOportunidadInput,
  type EstadoResuelto,
} from "@/lib/estados";
import {
  AJUSTES_PREDETERMINADOS,
  type AjustesApp,
  type CategoriaFinanza,
  type CategoriaFinanzaInput,
  type EntradaBitacora,
  type EstadoEmpresa,
  type EstadoTarea,
  type EventoCalendario,
  type EventoInput,
  type MovimientoFinanciero,
  type MovimientoInput,
  type NuevaEntradaBitacora,
  type Perfil,
  type PerfilInput,
  type Tarea,
  type TareaInput,
} from "@/lib/types";
import { hoyISO } from "@/lib/date";

function mensajeError(e: unknown): string {
  return e instanceof Error ? e.message : "Ocurrió un error inesperado.";
}

interface Fase2ContextValor {
  cargando: boolean;
  procesando: boolean;
  error: string | null;
  esSupabase: boolean;
  recargar: () => Promise<void>;

  // Tareas
  tareas: Tarea[];
  crearTarea: (input: TareaInput) => Promise<Tarea | null>;
  actualizarTarea: (
    id: string,
    cambios: Partial<TareaInput>,
  ) => Promise<Tarea | null>;
  moverTarea: (id: string, estado: EstadoTarea, orden: number) => Promise<void>;
  eliminarTarea: (id: string) => Promise<void>;

  // Finanzas — categorías
  categorias: CategoriaFinanza[];
  crearCategoria: (
    input: CategoriaFinanzaInput,
  ) => Promise<CategoriaFinanza | null>;
  actualizarCategoria: (
    id: string,
    cambios: Partial<CategoriaFinanzaInput>,
  ) => Promise<CategoriaFinanza | null>;
  eliminarCategoria: (id: string) => Promise<void>;

  // Finanzas — movimientos
  movimientos: MovimientoFinanciero[];
  crearMovimiento: (
    input: MovimientoInput,
  ) => Promise<MovimientoFinanciero | null>;
  actualizarMovimiento: (
    id: string,
    cambios: Partial<MovimientoInput>,
  ) => Promise<MovimientoFinanciero | null>;
  liquidarMovimiento: (id: string, liquidado: boolean) => Promise<void>;
  eliminarMovimiento: (id: string) => Promise<void>;

  // Calendario
  eventos: EventoCalendario[];
  crearEvento: (input: EventoInput) => Promise<EventoCalendario | null>;
  actualizarEvento: (
    id: string,
    cambios: Partial<EventoInput>,
  ) => Promise<EventoCalendario | null>;
  eliminarEvento: (id: string) => Promise<void>;

  // Configuración
  perfil: Perfil | null;
  guardarPerfil: (input: PerfilInput) => Promise<Perfil | null>;
  ajustes: AjustesApp;
  guardarAjustes: (ajustes: AjustesApp) => Promise<void>;

  // Bitácora (auditoría transversal)
  bitacora: EntradaBitacora[];
  anotarBitacora: (entrada: NuevaEntradaBitacora) => Promise<void>;

  // Personalización de estados de oportunidad
  estados: EstadoOportunidad[];
  estadosConfig: Record<EstadoEmpresa, EstadoResuelto>;
  guardarEstadoOportunidad: (
    input: EstadoOportunidadInput,
  ) => Promise<EstadoOportunidad | null>;
}

const Fase2Context = createContext<Fase2ContextValor | null>(null);

export function Fase2Provider({ children }: { children: React.ReactNode }) {
  const repo = useMemo(() => getFase2Repository(), []);
  const esSupabase = useMemo(() => usandoSupabase(), []);
  const montado = useRef(true);

  const [tareas, setTareas] = useState<Tarea[]>([]);
  const [categorias, setCategorias] = useState<CategoriaFinanza[]>([]);
  const [movimientos, setMovimientos] = useState<MovimientoFinanciero[]>([]);
  const [eventos, setEventos] = useState<EventoCalendario[]>([]);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [ajustes, setAjustes] = useState<AjustesApp>(AJUSTES_PREDETERMINADOS);
  const [bitacora, setBitacora] = useState<EntradaBitacora[]>([]);
  const [estados, setEstados] = useState<EstadoOportunidad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargar = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [t, c, m, ev, p, aj, bit, est] = await Promise.all([
        repo.listTareas(),
        repo.listCategorias(),
        repo.listMovimientos(),
        repo.listEventos(),
        repo.obtenerPerfil(),
        repo.obtenerAjustes(),
        repo.listBitacora(200),
        repo.listEstados(),
      ]);
      if (!montado.current) return;
      setTareas(t);
      setCategorias(c);
      setMovimientos(m);
      setEventos(ev);
      setAjustes(aj);
      setBitacora(bit);
      setEstados(est);

      // Si no hay perfil todavía, se crea uno mínimo con el correo de la sesión.
      if (p) {
        setPerfil(p);
      } else if (esSupabase) {
        const u = await getUsuarioActual();
        try {
          const creado = await repo.guardarPerfil({
            nombre: "",
            correo: u?.email ?? "",
            rol: "admin",
            activo: true,
          });
          if (montado.current) setPerfil(creado);
        } catch {
          if (montado.current) setPerfil(null);
        }
      } else {
        setPerfil(null);
      }
    } catch (e) {
      if (montado.current) setError(mensajeError(e));
      toast.error("No se pudieron cargar los módulos", {
        description: mensajeError(e),
      });
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [repo, esSupabase]);

  useEffect(() => {
    void cargar();
  }, [cargar]);

  // ── Helpers genéricos ──

  const conProceso = useCallback(
    async <T,>(
      accion: () => Promise<T>,
      exito: string,
      fallo: string,
    ): Promise<T | null> => {
      setProcesando(true);
      try {
        const r = await accion();
        if (exito) toast.success(exito);
        return r;
      } catch (e) {
        toast.error(fallo, { description: mensajeError(e) });
        return null;
      } finally {
        setProcesando(false);
      }
    },
    [],
  );

  /** Registra una entrada de bitácora sin bloquear la acción principal. */
  const anotar = useCallback(
    async (entrada: NuevaEntradaBitacora) => {
      try {
        await repo.registrarBitacora(entrada);
        if (montado.current) {
          setBitacora((prev) =>
            [
              {
                ...entrada,
                id: `tmp-${Math.random().toString(36).slice(2)}`,
                fecha: new Date().toISOString(),
              },
              ...prev,
            ].slice(0, 200),
          );
        }
      } catch {
        /* la bitácora nunca interrumpe la operación */
      }
    },
    [repo],
  );

  // ── Tareas ──

  const crearTarea = useCallback(
    (input: TareaInput) =>
      conProceso(
        async () => {
          const t = await repo.crearTarea(input);
          setTareas((prev) => [t, ...prev]);
          void anotar({
            entidad: "tarea",
            entidadId: t.id,
            accion: "crear",
            resumen: t.titulo,
          });
          return t;
        },
        "Tarea creada",
        "No se pudo crear la tarea",
      ),
    [repo, conProceso, anotar],
  );

  const actualizarTarea = useCallback(
    (id: string, cambios: Partial<TareaInput>) =>
      conProceso(
        async () => {
          const t = await repo.actualizarTarea(id, cambios);
          setTareas((prev) => prev.map((x) => (x.id === id ? t : x)));
          return t;
        },
        "Tarea actualizada",
        "No se pudo actualizar la tarea",
      ),
    [repo, conProceso],
  );

  const moverTarea = useCallback(
    async (id: string, estado: EstadoTarea, orden: number) => {
      const previo = tareas;
      setTareas((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                estado,
                orden,
                fechaCompletada:
                  estado === "hecha"
                    ? (t.fechaCompletada ?? new Date().toISOString())
                    : null,
              }
            : t,
        ),
      );
      try {
        await repo.actualizarTarea(id, { estado, orden });
      } catch (e) {
        setTareas(previo);
        toast.error("No se pudo mover la tarea", {
          description: mensajeError(e),
        });
      }
    },
    [tareas, repo],
  );

  const eliminarTarea = useCallback(
    async (id: string) => {
      const previo = tareas;
      const objetivo = tareas.find((t) => t.id === id);
      setTareas((prev) => prev.filter((t) => t.id !== id));
      try {
        await repo.eliminarTarea(id);
        toast.success("Tarea eliminada");
        void anotar({
          entidad: "tarea",
          entidadId: id,
          accion: "eliminar",
          resumen: objetivo?.titulo ?? "",
        });
      } catch (e) {
        setTareas(previo);
        toast.error("No se pudo eliminar la tarea", {
          description: mensajeError(e),
        });
      }
    },
    [tareas, repo, anotar],
  );

  // ── Categorías ──

  const crearCategoria = useCallback(
    (input: CategoriaFinanzaInput) =>
      conProceso(
        async () => {
          const c = await repo.crearCategoria(input);
          setCategorias((prev) =>
            [...prev, c].sort((a, b) => a.nombre.localeCompare(b.nombre)),
          );
          void anotar({
            entidad: "categoria",
            entidadId: c.id,
            accion: "crear",
            resumen: `${c.nombre} (${c.tipo})`,
          });
          return c;
        },
        "Categoría creada",
        "No se pudo crear la categoría",
      ),
    [repo, conProceso, anotar],
  );

  const actualizarCategoria = useCallback(
    (id: string, cambios: Partial<CategoriaFinanzaInput>) =>
      conProceso(
        async () => {
          const c = await repo.actualizarCategoria(id, cambios);
          setCategorias((prev) => prev.map((x) => (x.id === id ? c : x)));
          return c;
        },
        "Categoría actualizada",
        "No se pudo actualizar la categoría",
      ),
    [repo, conProceso],
  );

  const eliminarCategoria = useCallback(
    async (id: string) => {
      const previoCat = categorias;
      const previoMov = movimientos;
      setCategorias((prev) => prev.filter((c) => c.id !== id));
      setMovimientos((prev) =>
        prev.map((m) => (m.categoriaId === id ? { ...m, categoriaId: null } : m)),
      );
      try {
        await repo.eliminarCategoria(id);
        toast.success("Categoría eliminada");
        void anotar({
          entidad: "categoria",
          entidadId: id,
          accion: "eliminar",
          resumen: categorias.find((c) => c.id === id)?.nombre ?? "",
        });
      } catch (e) {
        setCategorias(previoCat);
        setMovimientos(previoMov);
        toast.error("No se pudo eliminar la categoría", {
          description: mensajeError(e),
        });
      }
    },
    [categorias, movimientos, repo, anotar],
  );

  // ── Movimientos ──

  const crearMovimiento = useCallback(
    (input: MovimientoInput) =>
      conProceso(
        async () => {
          const m = await repo.crearMovimiento(input);
          setMovimientos((prev) => [m, ...prev]);
          void anotar({
            entidad: "movimiento",
            entidadId: m.id,
            accion: "crear",
            resumen: `${m.tipo === "ingreso" ? "Ingreso" : "Egreso"}: ${m.concepto}`,
          });
          return m;
        },
        input.estado === "pendiente"
          ? "Cobro/pago pendiente creado"
          : "Movimiento registrado",
        "No se pudo registrar el movimiento",
      ),
    [repo, conProceso, anotar],
  );

  const actualizarMovimiento = useCallback(
    (id: string, cambios: Partial<MovimientoInput>) =>
      conProceso(
        async () => {
          const m = await repo.actualizarMovimiento(id, cambios);
          setMovimientos((prev) => prev.map((x) => (x.id === id ? m : x)));
          return m;
        },
        "Movimiento actualizado",
        "No se pudo actualizar el movimiento",
      ),
    [repo, conProceso],
  );

  const liquidarMovimiento = useCallback(
    async (id: string, liquidado: boolean) => {
      const previo = movimientos;
      const cambios: Partial<MovimientoInput> = liquidado
        ? { estado: "liquidado", fechaLiquidado: hoyISO() }
        : { estado: "pendiente", fechaLiquidado: null };
      setMovimientos((prev) =>
        prev.map((m) => (m.id === id ? { ...m, ...cambios } : m)),
      );
      try {
        const m = await repo.actualizarMovimiento(id, cambios);
        setMovimientos((prev) => prev.map((x) => (x.id === id ? m : x)));
        toast.success(liquidado ? "Marcado como liquidado" : "Marcado como pendiente");
      } catch (e) {
        setMovimientos(previo);
        toast.error("No se pudo actualizar", { description: mensajeError(e) });
      }
    },
    [movimientos, repo],
  );

  const eliminarMovimiento = useCallback(
    async (id: string) => {
      const previo = movimientos;
      const objetivo = movimientos.find((m) => m.id === id);
      setMovimientos((prev) => prev.filter((m) => m.id !== id));
      try {
        await repo.eliminarMovimiento(id);
        toast.success("Movimiento eliminado");
        void anotar({
          entidad: "movimiento",
          entidadId: id,
          accion: "eliminar",
          resumen: objetivo?.concepto ?? "",
        });
      } catch (e) {
        setMovimientos(previo);
        toast.error("No se pudo eliminar el movimiento", {
          description: mensajeError(e),
        });
      }
    },
    [movimientos, repo, anotar],
  );

  // ── Eventos ──

  const crearEvento = useCallback(
    (input: EventoInput) =>
      conProceso(
        async () => {
          const ev = await repo.crearEvento(input);
          setEventos((prev) =>
            [...prev, ev].sort((a, b) => a.inicio.localeCompare(b.inicio)),
          );
          void anotar({
            entidad: "evento",
            entidadId: ev.id,
            accion: "crear",
            resumen: ev.titulo,
          });
          return ev;
        },
        "Evento creado",
        "No se pudo crear el evento",
      ),
    [repo, conProceso, anotar],
  );

  const actualizarEvento = useCallback(
    (id: string, cambios: Partial<EventoInput>) =>
      conProceso(
        async () => {
          const ev = await repo.actualizarEvento(id, cambios);
          setEventos((prev) =>
            prev
              .map((x) => (x.id === id ? ev : x))
              .sort((a, b) => a.inicio.localeCompare(b.inicio)),
          );
          return ev;
        },
        "Evento actualizado",
        "No se pudo actualizar el evento",
      ),
    [repo, conProceso],
  );

  const eliminarEvento = useCallback(
    async (id: string) => {
      const previo = eventos;
      const objetivo = eventos.find((e) => e.id === id);
      setEventos((prev) => prev.filter((e) => e.id !== id));
      try {
        await repo.eliminarEvento(id);
        toast.success("Evento eliminado");
        void anotar({
          entidad: "evento",
          entidadId: id,
          accion: "eliminar",
          resumen: objetivo?.titulo ?? "",
        });
      } catch (e) {
        setEventos(previo);
        toast.error("No se pudo eliminar el evento", {
          description: mensajeError(e),
        });
      }
    },
    [eventos, repo, anotar],
  );

  // ── Configuración ──

  const guardarPerfil = useCallback(
    (input: PerfilInput) =>
      conProceso(
        async () => {
          const p = await repo.guardarPerfil(input);
          setPerfil(p);
          return p;
        },
        "Perfil guardado",
        "No se pudo guardar el perfil",
      ),
    [repo, conProceso],
  );

  const estadosConfig = useMemo(() => resolverEstados(estados), [estados]);

  const guardarEstadoOportunidad = useCallback(
    (input: EstadoOportunidadInput) =>
      conProceso(
        async () => {
          const e = await repo.guardarEstado(input);
          setEstados((prev) => {
            const resto = prev.filter((x) => x.clave !== e.clave);
            return [...resto, e];
          });
          return e;
        },
        "", // el llamador (Configuración) muestra un único aviso
        "No se pudo actualizar el estado",
      ),
    [repo, conProceso],
  );

  const guardarAjustes = useCallback(
    async (nuevos: AjustesApp) => {
      const previo = ajustes;
      setAjustes(nuevos);
      try {
        const guardados = await repo.guardarAjustes(nuevos);
        setAjustes(guardados);
        toast.success("Ajustes guardados");
        void anotar({
          entidad: "ajustes",
          entidadId: null,
          accion: "editar",
          resumen: "Ajustes de la aplicación actualizados",
        });
      } catch (e) {
        setAjustes(previo);
        toast.error("No se pudieron guardar los ajustes", {
          description: mensajeError(e),
        });
      }
    },
    [ajustes, repo, anotar],
  );

  const valor: Fase2ContextValor = {
    cargando,
    procesando,
    error,
    esSupabase,
    recargar: cargar,
    tareas,
    crearTarea,
    actualizarTarea,
    moverTarea,
    eliminarTarea,
    categorias,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
    movimientos,
    crearMovimiento,
    actualizarMovimiento,
    liquidarMovimiento,
    eliminarMovimiento,
    eventos,
    crearEvento,
    actualizarEvento,
    eliminarEvento,
    perfil,
    guardarPerfil,
    ajustes,
    guardarAjustes,
    bitacora,
    anotarBitacora: anotar,
    estados,
    estadosConfig,
    guardarEstadoOportunidad,
  };

  return (
    <Fase2Context.Provider value={valor}>{children}</Fase2Context.Provider>
  );
}

export function useFase2(): Fase2ContextValor {
  const ctx = useContext(Fase2Context);
  if (!ctx) {
    throw new Error("useFase2 debe usarse dentro de <Fase2Provider>.");
  }
  return ctx;
}
