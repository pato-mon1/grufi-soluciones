import {
  STORAGE_KEY_ACTIVIDAD_TAREA,
  STORAGE_KEY_AJUSTES,
  STORAGE_KEY_BITACORA,
  STORAGE_KEY_CATEGORIAS,
  STORAGE_KEY_COMENTARIOS_TAREA,
  STORAGE_KEY_ESTADOS,
  STORAGE_KEY_EVENTOS,
  STORAGE_KEY_MOVIMIENTOS,
  STORAGE_KEY_NOTIFICACIONES,
  STORAGE_KEY_PERFIL,
  STORAGE_KEY_SUBTAREAS,
  STORAGE_KEY_TAREAS,
} from "@/lib/constants";
import type {
  EstadoOportunidad,
  EstadoOportunidadInput,
} from "@/lib/estados";
import { generarId } from "@/lib/utils";
import {
  AJUSTES_PREDETERMINADOS,
  type ActividadTarea,
  type AjustesApp,
  type CategoriaFinanza,
  type CategoriaFinanzaInput,
  type ComentarioTarea,
  type EntradaBitacora,
  type EventoCalendario,
  type EventoInput,
  type MiembroEquipo,
  type MovimientoFinanciero,
  type MovimientoInput,
  type Notificacion,
  type NuevaEntradaBitacora,
  type Perfil,
  type PerfilInput,
  type Subtarea,
  type SubtareaInput,
  type Tarea,
  type TareaInput,
} from "@/lib/types";
import type { Fase2Repository } from "@/lib/repository/fase2-types";

function ahora(): string {
  return new Date().toISOString();
}

function leer<T>(clave: string): T[] {
  if (typeof window === "undefined") return [];
  const crudo = window.localStorage.getItem(clave);
  if (!crudo) return [];
  try {
    const datos = JSON.parse(crudo);
    return Array.isArray(datos) ? (datos as T[]) : [];
  } catch {
    return [];
  }
}

function escribir(clave: string, valor: unknown): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(clave, JSON.stringify(valor));
}

function demora<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), 80));
}

/** Actualiza un elemento por id dentro de una colección de localStorage. */
function actualizarEnClave<T extends { id: string; fechaActualizacion: string }>(
  clave: string,
  id: string,
  cambios: Partial<T>,
  etiqueta: string,
): T {
  const lista = leer<T>(clave);
  const indice = lista.findIndex((x) => x.id === id);
  if (indice === -1) {
    throw new Error(`No se encontró ${etiqueta} que intentas actualizar.`);
  }
  const actualizado = {
    ...lista[indice],
    ...cambios,
    fechaActualizacion: ahora(),
  } as T;
  lista[indice] = actualizado;
  escribir(clave, lista);
  return actualizado;
}

class Fase2LocalRepository implements Fase2Repository {
  readonly nombre = "localStorage";

  // ── Tareas ──

  async listTareas(): Promise<Tarea[]> {
    return demora(leer<Tarea>(STORAGE_KEY_TAREAS));
  }

  async crearTarea(input: TareaInput): Promise<Tarea> {
    const lista = leer<Tarea>(STORAGE_KEY_TAREAS);
    const marca = ahora();
    const completada = input.estado === "completada";
    const tarea: Tarea = {
      ...input,
      titulo: input.titulo.trim(),
      id: generarId(),
      creadoPor: "local",
      fechaCompletada: completada ? marca : null,
      completadoPor: completada ? "local" : null,
      progreso: completada ? 100 : input.progreso,
      fechaLimite:
        input.fechaLimite ??
        (input.venceEn ? input.venceEn.slice(0, 10) : null),
      fechaCreacion: marca,
      fechaActualizacion: marca,
    };
    escribir(STORAGE_KEY_TAREAS, [tarea, ...lista]);
    return demora(tarea);
  }

  async actualizarTarea(
    id: string,
    cambios: Partial<TareaInput>,
  ): Promise<Tarea> {
    const parche: Partial<Tarea> = { ...cambios };
    const previa = leer<Tarea>(STORAGE_KEY_TAREAS).find((t) => t.id === id);
    if (cambios.venceEn !== undefined) {
      parche.fechaLimite = cambios.venceEn
        ? cambios.venceEn.slice(0, 10)
        : (cambios.fechaLimite ?? null);
    }
    if (cambios.estado !== undefined) {
      if (cambios.estado === "completada") {
        parche.fechaCompletada = previa?.fechaCompletada ?? ahora();
        parche.completadoPor = "local";
        if ((cambios.progreso ?? previa?.progreso ?? 0) < 100) {
          parche.progreso = 100;
        }
      } else {
        parche.fechaCompletada = null;
        parche.completadoPor = null;
      }
    }
    return demora(
      actualizarEnClave<Tarea>(STORAGE_KEY_TAREAS, id, parche, "la tarea"),
    );
  }

  async eliminarTarea(id: string): Promise<void> {
    escribir(
      STORAGE_KEY_TAREAS,
      leer<Tarea>(STORAGE_KEY_TAREAS).filter((t) => t.id !== id),
    );
    escribir(
      STORAGE_KEY_SUBTAREAS,
      leer<Subtarea>(STORAGE_KEY_SUBTAREAS).filter((s) => s.tareaId !== id),
    );
    escribir(
      STORAGE_KEY_COMENTARIOS_TAREA,
      leer<ComentarioTarea>(STORAGE_KEY_COMENTARIOS_TAREA).filter(
        (c) => c.tareaId !== id,
      ),
    );
    await demora(null);
  }

  // ── Subtareas ──

  async listSubtareas(): Promise<Subtarea[]> {
    return demora(leer<Subtarea>(STORAGE_KEY_SUBTAREAS));
  }

  async crearSubtarea(
    tareaId: string,
    input: SubtareaInput,
  ): Promise<Subtarea> {
    const lista = leer<Subtarea>(STORAGE_KEY_SUBTAREAS);
    const nueva: Subtarea = {
      id: generarId(),
      tareaId,
      titulo: input.titulo.trim(),
      completada: false,
      completadaEn: null,
      completadaPor: null,
      orden: input.orden,
      fechaCreacion: ahora(),
    };
    escribir(STORAGE_KEY_SUBTAREAS, [...lista, nueva]);
    return demora(nueva);
  }

  async actualizarSubtarea(
    id: string,
    cambios: Partial<{ titulo: string; completada: boolean; orden: number }>,
  ): Promise<Subtarea> {
    const lista = leer<Subtarea>(STORAGE_KEY_SUBTAREAS);
    const indice = lista.findIndex((s) => s.id === id);
    if (indice === -1) throw new Error("No se encontró la subtarea.");
    const actual = lista[indice];
    const actualizada: Subtarea = {
      ...actual,
      ...(cambios.titulo !== undefined ? { titulo: cambios.titulo.trim() } : {}),
      ...(cambios.orden !== undefined ? { orden: cambios.orden } : {}),
      ...(cambios.completada !== undefined
        ? {
            completada: cambios.completada,
            completadaEn: cambios.completada ? ahora() : null,
            completadaPor: cambios.completada ? "local" : null,
          }
        : {}),
    };
    lista[indice] = actualizada;
    escribir(STORAGE_KEY_SUBTAREAS, lista);
    return demora(actualizada);
  }

  async eliminarSubtarea(id: string): Promise<void> {
    escribir(
      STORAGE_KEY_SUBTAREAS,
      leer<Subtarea>(STORAGE_KEY_SUBTAREAS).filter((s) => s.id !== id),
    );
    await demora(null);
  }

  // ── Comentarios de tareas ──

  async listComentarios(): Promise<ComentarioTarea[]> {
    return demora(leer<ComentarioTarea>(STORAGE_KEY_COMENTARIOS_TAREA));
  }

  async crearComentario(
    tareaId: string,
    contenido: string,
  ): Promise<ComentarioTarea> {
    const lista = leer<ComentarioTarea>(STORAGE_KEY_COMENTARIOS_TAREA);
    const marca = ahora();
    const nuevo: ComentarioTarea = {
      id: generarId(),
      tareaId,
      autorId: "local",
      contenido: contenido.trim(),
      fechaCreacion: marca,
      fechaActualizacion: marca,
    };
    escribir(STORAGE_KEY_COMENTARIOS_TAREA, [...lista, nuevo]);
    this.registrarActividadTarea(tareaId, "comentario", null, {
      comentario_id: nuevo.id,
    });
    return demora(nuevo);
  }

  async eliminarComentario(id: string): Promise<void> {
    const lista = leer<ComentarioTarea>(STORAGE_KEY_COMENTARIOS_TAREA);
    const obj = lista.find((c) => c.id === id);
    escribir(
      STORAGE_KEY_COMENTARIOS_TAREA,
      lista.filter((c) => c.id !== id),
    );
    if (obj) {
      this.registrarActividadTarea(obj.tareaId, "comentario_eliminado", {
        comentario_id: id,
      });
    }
    await demora(null);
  }

  // ── Actividad de tareas ──

  private registrarActividadTarea(
    tareaId: string | null,
    accion: string,
    previos: Record<string, unknown> | null = null,
    nuevos: Record<string, unknown> | null = null,
  ): void {
    const lista = leer<ActividadTarea>(STORAGE_KEY_ACTIVIDAD_TAREA);
    const entrada: ActividadTarea = {
      id: generarId(),
      tareaId,
      actorId: "local",
      accion,
      valoresPrevios: previos,
      valoresNuevos: nuevos,
      fechaCreacion: ahora(),
    };
    escribir(
      STORAGE_KEY_ACTIVIDAD_TAREA,
      [entrada, ...lista].slice(0, 500),
    );
  }

  /** Público para que el provider registre cambios de tarea en modo local. */
  async anotarActividadTarea(
    tareaId: string | null,
    accion: string,
    previos: Record<string, unknown> | null,
    nuevos: Record<string, unknown> | null,
  ): Promise<void> {
    this.registrarActividadTarea(tareaId, accion, previos, nuevos);
  }

  async listActividadTarea(): Promise<ActividadTarea[]> {
    return demora(
      [...leer<ActividadTarea>(STORAGE_KEY_ACTIVIDAD_TAREA)].sort((a, b) =>
        b.fechaCreacion.localeCompare(a.fechaCreacion),
      ),
    );
  }

  // ── Notificaciones ──

  async listNotificaciones(): Promise<Notificacion[]> {
    return demora(
      [...leer<Notificacion>(STORAGE_KEY_NOTIFICACIONES)]
        .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion))
        .slice(0, 100),
    );
  }

  async marcarNotificacion(id: string, leida: boolean): Promise<void> {
    const lista = leer<Notificacion>(STORAGE_KEY_NOTIFICACIONES);
    escribir(
      STORAGE_KEY_NOTIFICACIONES,
      lista.map((n) =>
        n.id === id ? { ...n, leidaEn: leida ? ahora() : null } : n,
      ),
    );
    await demora(null);
  }

  async marcarTodasNotificaciones(): Promise<void> {
    const lista = leer<Notificacion>(STORAGE_KEY_NOTIFICACIONES);
    const marca = ahora();
    escribir(
      STORAGE_KEY_NOTIFICACIONES,
      lista.map((n) => (n.leidaEn ? n : { ...n, leidaEn: marca })),
    );
    await demora(null);
  }

  // ── Equipo ──

  async listMiembrosEquipo(): Promise<MiembroEquipo[]> {
    const perfilCrudo =
      typeof window !== "undefined"
        ? window.localStorage.getItem(STORAGE_KEY_PERFIL)
        : null;
    let nombre = "Yo";
    if (perfilCrudo) {
      try {
        const p = JSON.parse(perfilCrudo) as { nombre?: string };
        if (p.nombre?.trim()) nombre = p.nombre.trim();
      } catch {
        /* ignora */
      }
    }
    return demora([
      { userId: "local", nombre, correo: "", rol: "admin" as const },
    ]);
  }

  async notificarMencion(): Promise<void> {
    /* sin efecto en modo local */
  }

  // ── Categorías ──

  async listCategorias(): Promise<CategoriaFinanza[]> {
    return demora(leer<CategoriaFinanza>(STORAGE_KEY_CATEGORIAS));
  }

  async crearCategoria(
    input: CategoriaFinanzaInput,
  ): Promise<CategoriaFinanza> {
    const lista = leer<CategoriaFinanza>(STORAGE_KEY_CATEGORIAS);
    const marca = ahora();
    const categoria: CategoriaFinanza = {
      ...input,
      nombre: input.nombre.trim(),
      id: generarId(),
      fechaCreacion: marca,
      fechaActualizacion: marca,
    };
    escribir(STORAGE_KEY_CATEGORIAS, [...lista, categoria]);
    return demora(categoria);
  }

  async actualizarCategoria(
    id: string,
    cambios: Partial<CategoriaFinanzaInput>,
  ): Promise<CategoriaFinanza> {
    return demora(
      actualizarEnClave<CategoriaFinanza>(
        STORAGE_KEY_CATEGORIAS,
        id,
        cambios,
        "la categoría",
      ),
    );
  }

  async eliminarCategoria(id: string): Promise<void> {
    escribir(
      STORAGE_KEY_CATEGORIAS,
      leer<CategoriaFinanza>(STORAGE_KEY_CATEGORIAS).filter((c) => c.id !== id),
    );
    // Los movimientos conservan su historial pero pierden la referencia.
    const movimientos = leer<MovimientoFinanciero>(STORAGE_KEY_MOVIMIENTOS).map(
      (m) => (m.categoriaId === id ? { ...m, categoriaId: null } : m),
    );
    escribir(STORAGE_KEY_MOVIMIENTOS, movimientos);
    await demora(null);
  }

  // ── Movimientos ──

  async listMovimientos(): Promise<MovimientoFinanciero[]> {
    return demora(leer<MovimientoFinanciero>(STORAGE_KEY_MOVIMIENTOS));
  }

  async crearMovimiento(
    input: MovimientoInput,
  ): Promise<MovimientoFinanciero> {
    const lista = leer<MovimientoFinanciero>(STORAGE_KEY_MOVIMIENTOS);
    const marca = ahora();
    const movimiento: MovimientoFinanciero = {
      ...input,
      concepto: input.concepto.trim(),
      monto: redondear2(input.monto),
      id: generarId(),
      fechaCreacion: marca,
      fechaActualizacion: marca,
    };
    escribir(STORAGE_KEY_MOVIMIENTOS, [movimiento, ...lista]);
    return demora(movimiento);
  }

  async actualizarMovimiento(
    id: string,
    cambios: Partial<MovimientoInput>,
  ): Promise<MovimientoFinanciero> {
    const parche: Partial<MovimientoFinanciero> = { ...cambios };
    if (cambios.monto !== undefined) parche.monto = redondear2(cambios.monto);
    return demora(
      actualizarEnClave<MovimientoFinanciero>(
        STORAGE_KEY_MOVIMIENTOS,
        id,
        parche,
        "el movimiento",
      ),
    );
  }

  async eliminarMovimiento(id: string): Promise<void> {
    escribir(
      STORAGE_KEY_MOVIMIENTOS,
      leer<MovimientoFinanciero>(STORAGE_KEY_MOVIMIENTOS).filter(
        (m) => m.id !== id,
      ),
    );
    await demora(null);
  }

  // ── Eventos ──

  async listEventos(): Promise<EventoCalendario[]> {
    return demora(leer<EventoCalendario>(STORAGE_KEY_EVENTOS));
  }

  async crearEvento(input: EventoInput): Promise<EventoCalendario> {
    const lista = leer<EventoCalendario>(STORAGE_KEY_EVENTOS);
    const marca = ahora();
    const evento: EventoCalendario = {
      ...input,
      titulo: input.titulo.trim(),
      id: generarId(),
      fechaCreacion: marca,
      fechaActualizacion: marca,
    };
    escribir(STORAGE_KEY_EVENTOS, [...lista, evento]);
    return demora(evento);
  }

  async actualizarEvento(
    id: string,
    cambios: Partial<EventoInput>,
  ): Promise<EventoCalendario> {
    return demora(
      actualizarEnClave<EventoCalendario>(
        STORAGE_KEY_EVENTOS,
        id,
        cambios,
        "el evento",
      ),
    );
  }

  async eliminarEvento(id: string): Promise<void> {
    escribir(
      STORAGE_KEY_EVENTOS,
      leer<EventoCalendario>(STORAGE_KEY_EVENTOS).filter((e) => e.id !== id),
    );
    await demora(null);
  }

  // ── Perfil ──

  async obtenerPerfil(): Promise<Perfil | null> {
    if (typeof window === "undefined") return null;
    const crudo = window.localStorage.getItem(STORAGE_KEY_PERFIL);
    if (!crudo) return null;
    try {
      return JSON.parse(crudo) as Perfil;
    } catch {
      return null;
    }
  }

  async guardarPerfil(input: PerfilInput): Promise<Perfil> {
    const previo = await this.obtenerPerfil();
    const marca = ahora();
    const perfil: Perfil = {
      ...input,
      nombre: input.nombre.trim(),
      correo: input.correo.trim(),
      fechaCreacion: previo?.fechaCreacion ?? marca,
      fechaActualizacion: marca,
    };
    escribir(STORAGE_KEY_PERFIL, perfil);
    return demora(perfil);
  }

  // ── Ajustes ──

  async obtenerAjustes(): Promise<AjustesApp> {
    if (typeof window === "undefined") return { ...AJUSTES_PREDETERMINADOS };
    const crudo = window.localStorage.getItem(STORAGE_KEY_AJUSTES);
    if (!crudo) return { ...AJUSTES_PREDETERMINADOS };
    try {
      return { ...AJUSTES_PREDETERMINADOS, ...(JSON.parse(crudo) as object) };
    } catch {
      return { ...AJUSTES_PREDETERMINADOS };
    }
  }

  async guardarAjustes(ajustes: AjustesApp): Promise<AjustesApp> {
    const normalizados: AjustesApp = { ...AJUSTES_PREDETERMINADOS, ...ajustes };
    escribir(STORAGE_KEY_AJUSTES, normalizados);
    return demora(normalizados);
  }

  // ── Bitácora ──

  async listBitacora(limite = 200): Promise<EntradaBitacora[]> {
    const lista = leer<EntradaBitacora>(STORAGE_KEY_BITACORA);
    return demora(
      [...lista]
        .sort((a, b) => b.fecha.localeCompare(a.fecha))
        .slice(0, limite),
    );
  }

  async registrarBitacora(entrada: NuevaEntradaBitacora): Promise<void> {
    const lista = leer<EntradaBitacora>(STORAGE_KEY_BITACORA);
    const nueva: EntradaBitacora = {
      ...entrada,
      id: generarId(),
      fecha: ahora(),
    };
    // Se conservan como máximo las 500 entradas más recientes.
    escribir(STORAGE_KEY_BITACORA, [nueva, ...lista].slice(0, 500));
  }

  // ── Estados de oportunidad ──

  async listEstados(): Promise<EstadoOportunidad[]> {
    return demora(leer<EstadoOportunidad>(STORAGE_KEY_ESTADOS));
  }

  async guardarEstado(
    input: EstadoOportunidadInput,
  ): Promise<EstadoOportunidad> {
    const lista = leer<EstadoOportunidad>(STORAGE_KEY_ESTADOS);
    const marca = ahora();
    const indice = lista.findIndex((x) => x.clave === input.clave);
    const guardado: EstadoOportunidad = {
      clave: input.clave,
      etiqueta: input.etiqueta.trim(),
      color: input.color,
      orden: input.orden,
      fechaCreacion:
        indice === -1 ? marca : lista[indice].fechaCreacion,
      fechaActualizacion: marca,
    };
    if (indice === -1) lista.push(guardado);
    else lista[indice] = guardado;
    escribir(STORAGE_KEY_ESTADOS, lista);
    return demora(guardado);
  }
}

function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const fase2LocalRepository = new Fase2LocalRepository();
