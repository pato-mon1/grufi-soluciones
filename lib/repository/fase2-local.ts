import {
  STORAGE_KEY_AJUSTES,
  STORAGE_KEY_CATEGORIAS,
  STORAGE_KEY_EVENTOS,
  STORAGE_KEY_MOVIMIENTOS,
  STORAGE_KEY_PERFIL,
  STORAGE_KEY_TAREAS,
} from "@/lib/constants";
import { generarId } from "@/lib/utils";
import {
  AJUSTES_PREDETERMINADOS,
  type AjustesApp,
  type CategoriaFinanza,
  type CategoriaFinanzaInput,
  type EventoCalendario,
  type EventoInput,
  type MovimientoFinanciero,
  type MovimientoInput,
  type Perfil,
  type PerfilInput,
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
    const tarea: Tarea = {
      ...input,
      titulo: input.titulo.trim(),
      id: generarId(),
      fechaCompletada: input.estado === "hecha" ? marca : null,
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
    if (cambios.estado !== undefined) {
      const previa = leer<Tarea>(STORAGE_KEY_TAREAS).find((t) => t.id === id);
      if (cambios.estado === "hecha") {
        parche.fechaCompletada = previa?.fechaCompletada ?? ahora();
      } else {
        parche.fechaCompletada = null;
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
    await demora(null);
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
}

function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

export const fase2LocalRepository = new Fase2LocalRepository();
