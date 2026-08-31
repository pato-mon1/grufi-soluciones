import {
  SUPABASE_TABLE_AJUSTES,
  SUPABASE_TABLE_CATEGORIAS,
  SUPABASE_TABLE_EVENTOS,
  SUPABASE_TABLE_MOVIMIENTOS,
  SUPABASE_TABLE_PERFILES,
  SUPABASE_TABLE_TAREAS,
} from "@/lib/constants";
import { getSupabaseClient, getUsuarioActual } from "@/lib/supabase/client";
import {
  AJUSTES_PREDETERMINADOS,
  type AjustesApp,
  type CategoriaFinanza,
  type CategoriaFinanzaInput,
  type EstadoMovimiento,
  type EstadoTarea,
  type EventoCalendario,
  type EventoInput,
  type MovimientoFinanciero,
  type MovimientoInput,
  type Perfil,
  type PerfilInput,
  type PrioridadTarea,
  type RolPerfil,
  type Tarea,
  type TareaInput,
  type TipoEvento,
  type TipoMovimiento,
} from "@/lib/types";
import type { Fase2Repository } from "@/lib/repository/fase2-types";

// ── Filas (snake_case) ──────────────────────────────────────

interface FilaTarea {
  id: string;
  empresa_id: string | null;
  titulo: string;
  descripcion: string | null;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  fecha_limite: string | null;
  fecha_completada: string | null;
  orden: number | string | null;
  responsable: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface FilaCategoria {
  id: string;
  nombre: string;
  tipo: TipoMovimiento;
  color: string | null;
  archivada: boolean | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface FilaMovimiento {
  id: string;
  empresa_id: string | null;
  categoria_id: string | null;
  tipo: TipoMovimiento;
  concepto: string;
  monto: number | string | null;
  estado: EstadoMovimiento;
  fecha: string;
  fecha_liquidado: string | null;
  notas: string | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface FilaEvento {
  id: string;
  empresa_id: string | null;
  titulo: string;
  descripcion: string | null;
  inicio: string;
  fin: string | null;
  todo_el_dia: boolean | null;
  tipo: TipoEvento;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface FilaPerfil {
  nombre: string | null;
  correo: string | null;
  rol: RolPerfil;
  activo: boolean | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

// ── Utilidades ──────────────────────────────────────────────

function num(valor: number | string | null, porDefecto = 0): number {
  if (valor === null || valor === "") return porDefecto;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : porDefecto;
}

function redondear2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

// ── Mapeadores ──────────────────────────────────────────────

function aTarea(f: FilaTarea): Tarea {
  return {
    id: f.id,
    empresaId: f.empresa_id,
    titulo: f.titulo,
    descripcion: f.descripcion ?? "",
    estado: f.estado,
    prioridad: f.prioridad,
    fechaLimite: f.fecha_limite,
    fechaCompletada: f.fecha_completada,
    orden: num(f.orden),
    responsable: f.responsable ?? "",
    fechaCreacion: f.fecha_creacion,
    fechaActualizacion: f.fecha_actualizacion,
  };
}

function tareaAFila(input: Partial<TareaInput>): Record<string, unknown> {
  const fila: Record<string, unknown> = {};
  if (input.empresaId !== undefined) fila.empresa_id = input.empresaId;
  if (input.titulo !== undefined) fila.titulo = input.titulo.trim();
  if (input.descripcion !== undefined) fila.descripcion = input.descripcion;
  if (input.prioridad !== undefined) fila.prioridad = input.prioridad;
  if (input.fechaLimite !== undefined) fila.fecha_limite = input.fechaLimite;
  if (input.orden !== undefined) fila.orden = input.orden;
  if (input.responsable !== undefined) fila.responsable = input.responsable;
  if (input.estado !== undefined) {
    fila.estado = input.estado;
    fila.fecha_completada =
      input.estado === "hecha" ? new Date().toISOString() : null;
  }
  return fila;
}

function aCategoria(f: FilaCategoria): CategoriaFinanza {
  return {
    id: f.id,
    nombre: f.nombre,
    tipo: f.tipo,
    color: f.color ?? "#B89B5E",
    archivada: f.archivada ?? false,
    fechaCreacion: f.fecha_creacion,
    fechaActualizacion: f.fecha_actualizacion,
  };
}

function categoriaAFila(
  input: Partial<CategoriaFinanzaInput>,
): Record<string, unknown> {
  const fila: Record<string, unknown> = {};
  if (input.nombre !== undefined) fila.nombre = input.nombre.trim();
  if (input.tipo !== undefined) fila.tipo = input.tipo;
  if (input.color !== undefined) fila.color = input.color;
  if (input.archivada !== undefined) fila.archivada = input.archivada;
  return fila;
}

function aMovimiento(f: FilaMovimiento): MovimientoFinanciero {
  return {
    id: f.id,
    empresaId: f.empresa_id,
    categoriaId: f.categoria_id,
    tipo: f.tipo,
    concepto: f.concepto,
    monto: redondear2(num(f.monto)),
    estado: f.estado,
    fecha: f.fecha,
    fechaLiquidado: f.fecha_liquidado,
    notas: f.notas ?? "",
    fechaCreacion: f.fecha_creacion,
    fechaActualizacion: f.fecha_actualizacion,
  };
}

function movimientoAFila(
  input: Partial<MovimientoInput>,
): Record<string, unknown> {
  const fila: Record<string, unknown> = {};
  if (input.empresaId !== undefined) fila.empresa_id = input.empresaId;
  if (input.categoriaId !== undefined) fila.categoria_id = input.categoriaId;
  if (input.tipo !== undefined) fila.tipo = input.tipo;
  if (input.concepto !== undefined) fila.concepto = input.concepto.trim();
  if (input.monto !== undefined) fila.monto = redondear2(input.monto);
  if (input.estado !== undefined) fila.estado = input.estado;
  if (input.fecha !== undefined) fila.fecha = input.fecha;
  if (input.fechaLiquidado !== undefined)
    fila.fecha_liquidado = input.fechaLiquidado;
  if (input.notas !== undefined) fila.notas = input.notas;
  return fila;
}

function aEvento(f: FilaEvento): EventoCalendario {
  return {
    id: f.id,
    empresaId: f.empresa_id,
    titulo: f.titulo,
    descripcion: f.descripcion ?? "",
    inicio: f.inicio,
    fin: f.fin,
    todoElDia: f.todo_el_dia ?? false,
    tipo: f.tipo,
    fechaCreacion: f.fecha_creacion,
    fechaActualizacion: f.fecha_actualizacion,
  };
}

function eventoAFila(input: Partial<EventoInput>): Record<string, unknown> {
  const fila: Record<string, unknown> = {};
  if (input.empresaId !== undefined) fila.empresa_id = input.empresaId;
  if (input.titulo !== undefined) fila.titulo = input.titulo.trim();
  if (input.descripcion !== undefined) fila.descripcion = input.descripcion;
  if (input.inicio !== undefined) fila.inicio = input.inicio;
  if (input.fin !== undefined) fila.fin = input.fin;
  if (input.todoElDia !== undefined) fila.todo_el_dia = input.todoElDia;
  if (input.tipo !== undefined) fila.tipo = input.tipo;
  return fila;
}

function aPerfil(f: FilaPerfil): Perfil {
  return {
    nombre: f.nombre ?? "",
    correo: f.correo ?? "",
    rol: f.rol,
    activo: f.activo ?? true,
    fechaCreacion: f.fecha_creacion,
    fechaActualizacion: f.fecha_actualizacion,
  };
}

// ── Repositorio ─────────────────────────────────────────────

class Fase2SupabaseRepository implements Fase2Repository {
  readonly nombre = "Supabase";

  private get sb() {
    return getSupabaseClient();
  }

  // Tareas

  async listTareas(): Promise<Tarea[]> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_TAREAS)
      .select("*")
      .order("orden", { ascending: true })
      .order("fecha_creacion", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as FilaTarea[]).map(aTarea);
  }

  async crearTarea(input: TareaInput): Promise<Tarea> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_TAREAS)
      .insert(tareaAFila(input))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aTarea(data as FilaTarea);
  }

  async actualizarTarea(
    id: string,
    cambios: Partial<TareaInput>,
  ): Promise<Tarea> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_TAREAS)
      .update(tareaAFila(cambios))
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aTarea(data as FilaTarea);
  }

  async eliminarTarea(id: string): Promise<void> {
    const { error } = await this.sb
      .from(SUPABASE_TABLE_TAREAS)
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Categorías

  async listCategorias(): Promise<CategoriaFinanza[]> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_CATEGORIAS)
      .select("*")
      .order("nombre", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as FilaCategoria[]).map(aCategoria);
  }

  async crearCategoria(
    input: CategoriaFinanzaInput,
  ): Promise<CategoriaFinanza> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_CATEGORIAS)
      .insert(categoriaAFila(input))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aCategoria(data as FilaCategoria);
  }

  async actualizarCategoria(
    id: string,
    cambios: Partial<CategoriaFinanzaInput>,
  ): Promise<CategoriaFinanza> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_CATEGORIAS)
      .update(categoriaAFila(cambios))
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aCategoria(data as FilaCategoria);
  }

  async eliminarCategoria(id: string): Promise<void> {
    // La FK usa ON DELETE SET NULL: los movimientos conservan su historial.
    const { error } = await this.sb
      .from(SUPABASE_TABLE_CATEGORIAS)
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Movimientos

  async listMovimientos(): Promise<MovimientoFinanciero[]> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_MOVIMIENTOS)
      .select("*")
      .order("fecha", { ascending: false })
      .order("fecha_creacion", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as FilaMovimiento[]).map(aMovimiento);
  }

  async crearMovimiento(
    input: MovimientoInput,
  ): Promise<MovimientoFinanciero> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_MOVIMIENTOS)
      .insert(movimientoAFila(input))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aMovimiento(data as FilaMovimiento);
  }

  async actualizarMovimiento(
    id: string,
    cambios: Partial<MovimientoInput>,
  ): Promise<MovimientoFinanciero> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_MOVIMIENTOS)
      .update(movimientoAFila(cambios))
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aMovimiento(data as FilaMovimiento);
  }

  async eliminarMovimiento(id: string): Promise<void> {
    const { error } = await this.sb
      .from(SUPABASE_TABLE_MOVIMIENTOS)
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Eventos

  async listEventos(): Promise<EventoCalendario[]> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_EVENTOS)
      .select("*")
      .order("inicio", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as FilaEvento[]).map(aEvento);
  }

  async crearEvento(input: EventoInput): Promise<EventoCalendario> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_EVENTOS)
      .insert(eventoAFila(input))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aEvento(data as FilaEvento);
  }

  async actualizarEvento(
    id: string,
    cambios: Partial<EventoInput>,
  ): Promise<EventoCalendario> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_EVENTOS)
      .update(eventoAFila(cambios))
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aEvento(data as FilaEvento);
  }

  async eliminarEvento(id: string): Promise<void> {
    const { error } = await this.sb
      .from(SUPABASE_TABLE_EVENTOS)
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Perfil

  async obtenerPerfil(): Promise<Perfil | null> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_PERFILES)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? aPerfil(data as FilaPerfil) : null;
  }

  async guardarPerfil(input: PerfilInput): Promise<Perfil> {
    const u = await getUsuarioActual();
    if (!u?.id) throw new Error("No hay una sesión activa.");
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_PERFILES)
      .upsert(
        {
          user_id: u.id,
          nombre: input.nombre.trim(),
          correo: input.correo.trim(),
          rol: input.rol,
          activo: input.activo,
        },
        { onConflict: "user_id" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aPerfil(data as FilaPerfil);
  }

  // Ajustes

  async obtenerAjustes(): Promise<AjustesApp> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_AJUSTES)
      .select("datos")
      .maybeSingle();
    if (error) throw new Error(error.message);
    const guardado = (data?.datos ?? {}) as Partial<AjustesApp>;
    return { ...AJUSTES_PREDETERMINADOS, ...guardado };
  }

  async guardarAjustes(ajustes: AjustesApp): Promise<AjustesApp> {
    const normalizados: AjustesApp = { ...AJUSTES_PREDETERMINADOS, ...ajustes };
    const u = await getUsuarioActual();
    if (!u?.id) throw new Error("No hay una sesión activa.");
    const { error } = await this.sb
      .from(SUPABASE_TABLE_AJUSTES)
      .upsert(
        { user_id: u.id, datos: normalizados },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return normalizados;
  }
}

export const fase2SupabaseRepository = new Fase2SupabaseRepository();
