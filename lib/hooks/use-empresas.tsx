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
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  fijarPreferenciaModo,
  getRepository,
  usandoSupabase,
} from "@/lib/repository";
import { leerSnapshotLocal } from "@/lib/repository/local-storage-repository";
import { getSupabaseClient } from "@/lib/supabase/client";
import type {
  Actividad,
  BorradorContacto,
  Contacto,
  ContactoInput,
  Empresa,
  EmpresaInput,
  EstadoEmpresa,
  NuevaActividad,
} from "@/lib/types";
import { formatearFecha, formatearFechaLarga, hoyISO } from "@/lib/date";

interface DatosSeguimiento {
  fechaProximoSeguimiento: string | null;
  nota: string;
}

interface ImportacionPendiente {
  empresas: Empresa[];
  contactos: Contacto[];
  actividades: Actividad[];
}

interface EmpresasContextValor {
  empresas: Empresa[];
  contactos: Contacto[];
  actividades: Actividad[];
  cargando: boolean;
  procesando: boolean;
  error: string | null;
  backend: string;
  esSupabase: boolean;
  // Autenticación (solo en modo Supabase). El acceso se protege en el
  // middleware y en el Server Component; aquí solo se expone el usuario y el
  // cierre de sesión.
  usuario: string | null;
  cerrarSesion: () => Promise<void>;
  // Migración de datos locales -> Supabase
  importacionPendiente: number;
  importarLocalesASupabase: () => Promise<void>;
  continuarEnModoLocal: () => void;
  // Empresas
  recargar: () => Promise<void>;
  agregar: (input: EmpresaInput) => Promise<Empresa | null>;
  editar: (id: string, input: EmpresaInput) => Promise<Empresa | null>;
  cambiarEstado: (id: string, estado: EstadoEmpresa) => Promise<void>;
  actualizarNotas: (id: string, notas: string) => Promise<void>;
  actualizarMonto: (id: string, monto: number | null) => Promise<void>;
  actualizarProximoSeguimiento: (
    id: string,
    fecha: string | null,
  ) => Promise<void>;
  completarProximoSeguimiento: (
    id: string,
    nuevaFecha: string | null,
  ) => Promise<void>;
  alternarRequiereSeguimiento: (id: string, valor: boolean) => Promise<void>;
  marcarSeguimiento: (id: string, datos: DatosSeguimiento) => Promise<boolean>;
  eliminar: (id: string) => Promise<void>;
  importar: (
    inputs: EmpresaInput[],
    contactosPorEmpresa?: ContactoInput[][],
  ) => Promise<number>;
  // Contactos
  agregarContacto: (
    empresaId: string,
    input: ContactoInput,
  ) => Promise<Contacto | null>;
  editarContacto: (
    id: string,
    cambios: Partial<ContactoInput>,
  ) => Promise<Contacto | null>;
  eliminarContacto: (id: string) => Promise<void>;
  marcarContactoPrincipal: (id: string) => Promise<void>;
  /** Sincroniza (crear/editar/eliminar) los contactos de una empresa. */
  sincronizarContactos: (
    empresaId: string,
    borradores: BorradorContacto[],
  ) => Promise<void>;
  // Actividades
  registrarActividad: (input: NuevaActividad) => Promise<Actividad | null>;
}

const EmpresasContext = createContext<EmpresasContextValor | null>(null);

function mensajeError(e: unknown): string {
  if (e instanceof Error) return e.message;
  return "Ocurrió un error inesperado.";
}

export function EmpresasProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const repo = useMemo(() => getRepository(), []);
  const esSupabase = useMemo(() => usandoSupabase(), []);

  const [empresas, setEmpresas] = useState<Empresa[]>([]);
  const [contactos, setContactos] = useState<Contacto[]>([]);
  const [actividades, setActividades] = useState<Actividad[]>([]);
  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const montado = useRef(true);

  const [usuario, setUsuario] = useState<string | null>(null);
  const [importacion, setImportacion] = useState<ImportacionPendiente | null>(
    null,
  );

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const cargarDatos = useCallback(async () => {
    setCargando(true);
    setError(null);
    try {
      const [emp, con, act] = await Promise.all([
        repo.list(),
        repo.listContactos(),
        repo.listActividades(),
      ]);
      if (!montado.current) return;
      setEmpresas(emp);
      setContactos(con);
      setActividades(act);

      // Primera conexión a Supabase sin datos: ¿importar los locales?
      if (esSupabase && emp.length === 0) {
        const snap = leerSnapshotLocal();
        if (snap.empresas.length > 0) setImportacion(snap);
      }
    } catch (e) {
      if (montado.current) setError(mensajeError(e));
      toast.error("No se pudieron cargar los datos", {
        description: mensajeError(e),
      });
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [repo, esSupabase]);

  const recargar = cargarDatos;

  // Carga de datos + seguimiento de la sesión.
  // El acceso ya está garantizado por el middleware y el Server Component:
  // si el dashboard se está renderizando en modo Supabase, hay sesión válida.
  useEffect(() => {
    void cargarDatos();
    if (!esSupabase) return;

    const sb = getSupabaseClient();
    let cancelado = false;

    // getSession() lee la sesión guardada (sin red); la validación real ya la
    // hizo el middleware. Evita una llamada lenta a /auth/v1/user al cargar.
    sb.auth.getSession().then(({ data }) => {
      if (!cancelado) setUsuario(data.session?.user?.email ?? null);
    });

    const { data: sub } = sb.auth.onAuthStateChange((evento, session) => {
      setUsuario(session?.user?.email ?? null);
      if (evento === "SIGNED_OUT") {
        setEmpresas([]);
        setContactos([]);
        setActividades([]);
        router.replace("/login");
      }
    });

    return () => {
      cancelado = true;
      sub.subscription.unsubscribe();
    };
  }, [esSupabase, cargarDatos, router]);

  const cerrarSesion = useCallback(async () => {
    try {
      await getSupabaseClient().auth.signOut();
      toast.success("Sesión cerrada");
    } catch (e) {
      toast.error("No se pudo cerrar la sesión", {
        description: mensajeError(e),
      });
    } finally {
      router.replace("/login");
      router.refresh();
    }
  }, [router]);

  const continuarEnModoLocal = useCallback(() => {
    fijarPreferenciaModo("local");
    setImportacion(null);
    toast.info("Continuando en modo local. Puedes activar Supabase más tarde.");
    window.location.reload();
  }, []);

  // ── Actividades automáticas (no bloqueantes) ──
  const registrarAuto = useCallback(
    async (
      empresaId: string,
      tipo: NuevaActividad["tipo"],
      descripcion: string,
    ) => {
      try {
        const act = await repo.crearActividad({
          empresaId,
          tipo,
          fechaHora: new Date().toISOString(),
          descripcion,
        });
        if (montado.current) setActividades((prev) => [act, ...prev]);
      } catch {
        /* el registro automático no debe interrumpir la acción principal */
      }
    },
    [repo],
  );

  const agregar = useCallback(
    async (input: EmpresaInput): Promise<Empresa | null> => {
      setProcesando(true);
      try {
        const creada = await repo.create(input);
        setEmpresas((prev) => [creada, ...prev]);
        toast.success("Empresa agregada", { description: creada.nombre });
        return creada;
      } catch (e) {
        toast.error("No se pudo agregar la empresa", {
          description: mensajeError(e),
        });
        return null;
      } finally {
        setProcesando(false);
      }
    },
    [repo],
  );

  const editar = useCallback(
    async (id: string, input: EmpresaInput): Promise<Empresa | null> => {
      const anterior = empresas.find((e) => e.id === id);
      setProcesando(true);
      try {
        const actualizada = await repo.update(id, input);
        setEmpresas((prev) => prev.map((e) => (e.id === id ? actualizada : e)));
        toast.success("Cambios guardados", { description: actualizada.nombre });
        // Cambio de estado desde el formulario: actividad automática.
        if (anterior && anterior.estado !== actualizada.estado) {
          void registrarAuto(
            id,
            "Cambio de estado",
            `Estado cambiado de "${anterior.estado}" a "${actualizada.estado}"`,
          );
        }
        return actualizada;
      } catch (e) {
        toast.error("No se pudieron guardar los cambios", {
          description: mensajeError(e),
        });
        return null;
      } finally {
        setProcesando(false);
      }
    },
    [empresas, repo, registrarAuto],
  );

  const parchear = useCallback(
    async (
      id: string,
      cambios: Partial<EmpresaInput>,
      mensaje: string,
    ): Promise<Empresa | null> => {
      const previo = empresas;
      setEmpresas((prev) =>
        prev.map((e) =>
          e.id === id
            ? { ...e, ...cambios, fechaActualizacion: new Date().toISOString() }
            : e,
        ),
      );
      try {
        const actualizada = await repo.update(id, cambios);
        setEmpresas((prev) => prev.map((e) => (e.id === id ? actualizada : e)));
        toast.success(mensaje);
        return actualizada;
      } catch (e) {
        setEmpresas(previo);
        toast.error("No se pudo actualizar", { description: mensajeError(e) });
        return null;
      }
    },
    [empresas, repo],
  );

  const cambiarEstado = useCallback(
    async (id: string, estado: EstadoEmpresa) => {
      const anterior = empresas.find((e) => e.id === id)?.estado;
      const ok = await parchear(
        id,
        { estado },
        `Estado actualizado a "${estado}"`,
      );
      if (ok && anterior && anterior !== estado) {
        void registrarAuto(
          id,
          "Cambio de estado",
          `Estado cambiado de "${anterior}" a "${estado}"`,
        );
      }
    },
    [empresas, parchear, registrarAuto],
  );

  const actualizarNotas = useCallback(
    async (id: string, notas: string) => {
      await parchear(id, { notas }, "Notas actualizadas");
    },
    [parchear],
  );

  const actualizarMonto = useCallback(
    async (id: string, monto: number | null) => {
      await parchear(
        id,
        { montoResultado: monto },
        monto === null ? "Monto eliminado" : "Monto del resultado actualizado",
      );
    },
    [parchear],
  );

  const actualizarProximoSeguimiento = useCallback(
    async (id: string, fecha: string | null) => {
      const anterior = empresas.find((e) => e.id === id)?.fechaProximoSeguimiento;
      const ok = await parchear(
        id,
        { fechaProximoSeguimiento: fecha },
        fecha === null
          ? "Fecha de próximo seguimiento eliminada"
          : "Fecha de próximo seguimiento actualizada",
      );
      if (ok && fecha && fecha !== anterior) {
        void registrarAuto(
          id,
          "Nota",
          `Nuevo seguimiento programado para el ${formatearFechaLarga(fecha)}`,
        );
      }
    },
    [empresas, parchear, registrarAuto],
  );

  const completarProximoSeguimiento = useCallback(
    async (id: string, nuevaFecha: string | null) => {
      const anterior = empresas.find((e) => e.id === id)?.fechaProximoSeguimiento;
      const ok = await parchear(
        id,
        { fechaProximoSeguimiento: nuevaFecha },
        nuevaFecha
          ? "Seguimiento completado. Nueva fecha agendada."
          : "Seguimiento completado. Sin nueva fecha.",
      );
      if (!ok) return;
      void registrarAuto(
        id,
        "Seguimiento completado",
        anterior
          ? `Seguimiento del ${formatearFechaLarga(anterior)} marcado como completado`
          : "Seguimiento marcado como completado",
      );
      if (nuevaFecha) {
        void registrarAuto(
          id,
          "Nota",
          `Nuevo seguimiento programado para el ${formatearFechaLarga(nuevaFecha)}`,
        );
      }
    },
    [empresas, parchear, registrarAuto],
  );

  const alternarRequiereSeguimiento = useCallback(
    async (id: string, valor: boolean) => {
      await parchear(
        id,
        { requiereSeguimiento: valor },
        valor
          ? "Marcada como próximo seguimiento"
          : "Marca de próximo seguimiento quitada",
      );
    },
    [parchear],
  );

  const marcarSeguimiento = useCallback(
    async (id: string, datos: DatosSeguimiento): Promise<boolean> => {
      const empresa = empresas.find((e) => e.id === id);
      if (!empresa) return false;

      const hoy = hoyISO();
      const anterior = empresa.fechaProximoSeguimiento;
      const notaLimpia = datos.nota.trim();
      const notasActualizadas = notaLimpia
        ? `${empresa.notas ? `${empresa.notas}\n\n` : ""}[${formatearFecha(hoy)}] ${notaLimpia}`
        : empresa.notas;

      setProcesando(true);
      try {
        const actualizada = await repo.update(id, {
          fechaUltimoContacto: hoy,
          fechaProximoSeguimiento: datos.fechaProximoSeguimiento,
          notas: notasActualizadas,
        });
        setEmpresas((prev) => prev.map((e) => (e.id === id ? actualizada : e)));
        toast.success("Seguimiento registrado", {
          description: "Se actualizó la fecha de último contacto.",
        });
        void registrarAuto(
          id,
          "Seguimiento completado",
          anterior
            ? `Seguimiento del ${formatearFechaLarga(anterior)} marcado como completado`
            : "Seguimiento marcado como completado",
        );
        if (
          datos.fechaProximoSeguimiento &&
          datos.fechaProximoSeguimiento !== anterior
        ) {
          void registrarAuto(
            id,
            "Nota",
            `Nuevo seguimiento programado para el ${formatearFechaLarga(
              datos.fechaProximoSeguimiento,
            )}`,
          );
        }
        return true;
      } catch (e) {
        toast.error("No se pudo registrar el seguimiento", {
          description: mensajeError(e),
        });
        return false;
      } finally {
        setProcesando(false);
      }
    },
    [empresas, repo, registrarAuto],
  );

  const eliminar = useCallback(
    async (id: string) => {
      const empresa = empresas.find((e) => e.id === id);
      const previoEmp = empresas;
      const previoCon = contactos;
      const previoAct = actividades;
      setEmpresas((prev) => prev.filter((e) => e.id !== id));
      setContactos((prev) => prev.filter((c) => c.empresaId !== id));
      setActividades((prev) => prev.filter((a) => a.empresaId !== id));
      try {
        await repo.remove(id);
        toast.success("Empresa eliminada", { description: empresa?.nombre });
      } catch (e) {
        setEmpresas(previoEmp);
        setContactos(previoCon);
        setActividades(previoAct);
        toast.error("No se pudo eliminar la empresa", {
          description: mensajeError(e),
        });
      }
    },
    [empresas, contactos, actividades, repo],
  );

  const importar = useCallback(
    async (
      inputs: EmpresaInput[],
      contactosPorEmpresa?: ContactoInput[][],
    ): Promise<number> => {
      if (inputs.length === 0) {
        toast.warning("El archivo no contenía empresas válidas.");
        return 0;
      }
      setProcesando(true);
      try {
        const creadas = await repo.bulkCreate(inputs);
        setEmpresas((prev) => [...creadas, ...prev]);
        // Contactos que vinieron con las empresas importadas.
        if (contactosPorEmpresa) {
          for (let i = 0; i < creadas.length; i++) {
            for (const c of contactosPorEmpresa[i] ?? []) {
              try {
                const nuevo = await repo.crearContacto(creadas[i].id, c);
                setContactos((prev) => [...prev, nuevo]);
              } catch {
                /* omitir contacto con error, no romper la importación */
              }
            }
          }
        }
        toast.success(
          `${creadas.length} empresa${creadas.length === 1 ? "" : "s"} importada${
            creadas.length === 1 ? "" : "s"
          }`,
        );
        return creadas.length;
      } catch (e) {
        toast.error("No se pudo completar la importación", {
          description: mensajeError(e),
        });
        return 0;
      } finally {
        setProcesando(false);
      }
    },
    [repo],
  );

  // ── Contactos ──

  const agregarContacto = useCallback(
    async (
      empresaId: string,
      input: ContactoInput,
    ): Promise<Contacto | null> => {
      setProcesando(true);
      try {
        const nuevo = await repo.crearContacto(empresaId, input);
        setContactos((prev) => {
          const base = nuevo.principal
            ? prev.map((c) =>
                c.empresaId === empresaId ? { ...c, principal: false } : c,
              )
            : prev;
          return [...base, nuevo];
        });
        toast.success("Contacto agregado");
        return nuevo;
      } catch (e) {
        toast.error("No se pudo agregar el contacto", {
          description: mensajeError(e),
        });
        return null;
      } finally {
        setProcesando(false);
      }
    },
    [repo],
  );

  const editarContacto = useCallback(
    async (
      id: string,
      cambios: Partial<ContactoInput>,
    ): Promise<Contacto | null> => {
      setProcesando(true);
      try {
        const actualizado = await repo.actualizarContacto(id, cambios);
        setContactos((prev) => {
          const lista = prev.map((c) => (c.id === id ? actualizado : c));
          return actualizado.principal
            ? lista.map((c) =>
                c.empresaId === actualizado.empresaId && c.id !== id
                  ? { ...c, principal: false }
                  : c,
              )
            : lista;
        });
        toast.success("Contacto actualizado");
        return actualizado;
      } catch (e) {
        toast.error("No se pudo actualizar el contacto", {
          description: mensajeError(e),
        });
        return null;
      } finally {
        setProcesando(false);
      }
    },
    [repo],
  );

  const eliminarContacto = useCallback(
    async (id: string) => {
      const previo = contactos;
      setContactos((prev) => prev.filter((c) => c.id !== id));
      try {
        await repo.eliminarContacto(id);
        toast.success("Contacto eliminado");
      } catch (e) {
        setContactos(previo);
        toast.error("No se pudo eliminar el contacto", {
          description: mensajeError(e),
        });
      }
    },
    [contactos, repo],
  );

  const marcarContactoPrincipal = useCallback(
    async (id: string) => {
      const contacto = contactos.find((c) => c.id === id);
      if (!contacto) return;
      await editarContacto(id, { principal: true });
    },
    [contactos, editarContacto],
  );

  const sincronizarContactos = useCallback(
    async (empresaId: string, borradores: BorradorContacto[]) => {
      const originales = contactos.filter((c) => c.empresaId === empresaId);
      const idsVigentes = new Set(
        borradores.map((b) => b.id).filter((x): x is string => Boolean(x)),
      );
      try {
        for (const o of originales) {
          if (!idsVigentes.has(o.id)) await repo.eliminarContacto(o.id);
        }
        for (const b of borradores) {
          const input: ContactoInput = {
            nombre: b.nombre,
            puesto: b.puesto,
            telefono: b.telefono,
            correo: b.correo,
            principal: b.principal,
          };
          if (b.id) await repo.actualizarContacto(b.id, input);
          else await repo.crearContacto(empresaId, input);
        }
        setContactos(await repo.listContactos());
      } catch (e) {
        toast.error("No se pudieron guardar todos los contactos", {
          description: mensajeError(e),
        });
        try {
          setContactos(await repo.listContactos());
        } catch {
          /* se conserva el estado actual */
        }
      }
    },
    [contactos, repo],
  );

  // ── Actividades (manual) ──

  const registrarActividad = useCallback(
    async (input: NuevaActividad): Promise<Actividad | null> => {
      setProcesando(true);
      try {
        const act = await repo.crearActividad(input);
        setActividades((prev) => [act, ...prev]);
        toast.success("Actividad registrada");
        return act;
      } catch (e) {
        toast.error("No se pudo registrar la actividad", {
          description: mensajeError(e),
        });
        return null;
      } finally {
        setProcesando(false);
      }
    },
    [repo],
  );

  // ── Migración local -> Supabase ──

  const importarLocalesASupabase = useCallback(async () => {
    if (!importacion) return;
    setProcesando(true);
    try {
      // Empresas ya en Supabase (para no duplicar por nombre).
      const existentes = new Set(
        empresas.map((e) => e.nombre.trim().toLowerCase()),
      );
      let nEmp = 0;
      let nCon = 0;
      let nAct = 0;

      for (const emp of importacion.empresas) {
        if (existentes.has(emp.nombre.trim().toLowerCase())) continue;
        const creada = await repo.create({
          nombre: emp.nombre,
          estado: emp.estado,
          montoResultado: emp.montoResultado,
          notas: emp.notas,
          fechaUltimoContacto: emp.fechaUltimoContacto,
          fechaProximoSeguimiento: emp.fechaProximoSeguimiento,
          requiereSeguimiento: emp.requiereSeguimiento,
        });
        existentes.add(creada.nombre.trim().toLowerCase());
        nEmp++;

        for (const c of importacion.contactos.filter(
          (x) => x.empresaId === emp.id,
        )) {
          await repo.crearContacto(creada.id, {
            nombre: c.nombre,
            puesto: c.puesto,
            telefono: c.telefono,
            correo: c.correo,
            principal: c.principal,
          });
          nCon++;
        }
        for (const a of importacion.actividades.filter(
          (x) => x.empresaId === emp.id,
        )) {
          await repo.crearActividad({
            empresaId: creada.id,
            tipo: a.tipo,
            fechaHora: a.fechaHora,
            descripcion: a.descripcion,
          });
          nAct++;
        }
      }

      setImportacion(null);
      await cargarDatos();
      toast.success("Importación completada", {
        description: `${nEmp} empresas, ${nCon} contactos y ${nAct} actividades importadas a Supabase.`,
      });
    } catch (e) {
      toast.error("No se pudo completar la importación", {
        description: mensajeError(e),
      });
    } finally {
      setProcesando(false);
    }
  }, [importacion, empresas, repo, cargarDatos]);

  const valor: EmpresasContextValor = {
    empresas,
    contactos,
    actividades,
    cargando,
    procesando,
    error,
    backend: repo.nombre,
    esSupabase,
    usuario,
    cerrarSesion,
    importacionPendiente: importacion?.empresas.length ?? 0,
    importarLocalesASupabase,
    continuarEnModoLocal,
    recargar,
    agregar,
    editar,
    cambiarEstado,
    actualizarNotas,
    actualizarMonto,
    actualizarProximoSeguimiento,
    completarProximoSeguimiento,
    alternarRequiereSeguimiento,
    marcarSeguimiento,
    eliminar,
    importar,
    agregarContacto,
    editarContacto,
    eliminarContacto,
    marcarContactoPrincipal,
    sincronizarContactos,
    registrarActividad,
  };

  return (
    <EmpresasContext.Provider value={valor}>{children}</EmpresasContext.Provider>
  );
}

export function useEmpresas(): EmpresasContextValor {
  const contexto = useContext(EmpresasContext);
  if (!contexto) {
    throw new Error("useEmpresas debe usarse dentro de <EmpresasProvider>.");
  }
  return contexto;
}
