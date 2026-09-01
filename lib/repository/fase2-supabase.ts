import {
  SUPABASE_TABLE_AJUSTES,
  SUPABASE_TABLE_BITACORA,
  SUPABASE_TABLE_CATEGORIAS,
  SUPABASE_TABLE_ESTADOS,
  SUPABASE_TABLE_EVENTOS,
  SUPABASE_TABLE_MOVIMIENTOS,
  SUPABASE_TABLE_PERFILES,
  SUPABASE_TABLE_TAREAS,
} from "@/lib/constants";
import type {
  EstadoOportunidad,
  EstadoOportunidadInput,
} from "@/lib/estados";
import { getSupabaseClient, getUsuarioActual } from "@/lib/supabase/client";
import {
  AJUSTES_PREDETERMINADOS,
  type AccionBitacora,
  type ActividadTarea,
  type AjustesApp,
  type CategoriaFinanza,
  type CategoriaFinanzaInput,
  type ComentarioTarea,
  type EntidadBitacora,
  type EntradaBitacora,
  type EstadoMovimiento,
  type EstadoTarea,
  type EventoCalendario,
  type EventoInput,
  type MiembroEquipo,
  type MovimientoFinanciero,
  type MovimientoInput,
  type Notificacion,
  type NuevaEntradaBitacora,
  type Perfil,
  type PerfilInput,
  type PrioridadTarea,
  type RolPerfil,
  type Subtarea,
  type SubtareaInput,
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
  contacto_id: string | null;
  titulo: string;
  descripcion: string | null;
  estado: EstadoTarea;
  prioridad: PrioridadTarea;
  asignado_a: string | null;
  creado_por: string | null;
  vence_en: string | null;
  fecha_limite: string | null;
  progreso: number | string | null;
  fecha_completada: string | null;
  completada_por: string | null;
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

interface FilaBitacora {
  id: string;
  entidad: EntidadBitacora;
  entidad_id: string | null;
  accion: AccionBitacora;
  resumen: string | null;
  fecha: string;
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
    contactoId: f.contacto_id,
    titulo: f.titulo,
    descripcion: f.descripcion ?? "",
    estado: f.estado,
    prioridad: f.prioridad,
    asignadoA: f.asignado_a,
    creadoPor: f.creado_por,
    venceEn: f.vence_en,
    fechaLimite: f.fecha_limite,
    progreso: num(f.progreso),
    fechaCompletada: f.fecha_completada,
    completadoPor: f.completada_por,
    orden: num(f.orden),
    responsable: f.responsable ?? "",
    fechaCreacion: f.fecha_creacion,
    fechaActualizacion: f.fecha_actualizacion,
  };
}

function tareaAFila(input: Partial<TareaInput>): Record<string, unknown> {
  const fila: Record<string, unknown> = {};
  if (input.empresaId !== undefined) fila.empresa_id = input.empresaId;
  if (input.contactoId !== undefined) fila.contacto_id = input.contactoId;
  if (input.titulo !== undefined) fila.titulo = input.titulo.trim();
  if (input.descripcion !== undefined) fila.descripcion = input.descripcion;
  if (input.prioridad !== undefined) fila.prioridad = input.prioridad;
  if (input.asignadoA !== undefined) fila.asignado_a = input.asignadoA;
  if (input.venceEn !== undefined) fila.vence_en = input.venceEn;
  if (input.fechaLimite !== undefined) fila.fecha_limite = input.fechaLimite;
  if (input.progreso !== undefined) fila.progreso = input.progreso;
  if (input.orden !== undefined) fila.orden = input.orden;
  if (input.responsable !== undefined) fila.responsable = input.responsable;
  // La conclusión (fecha_completada / completada_por) la fija un trigger.
  if (input.estado !== undefined) fila.estado = input.estado;
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

  // Subtareas

  async listSubtareas(): Promise<Subtarea[]> {
    const { data, error } = await this.sb
      .from("subtareas")
      .select("*")
      .order("orden", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as Array<Record<string, unknown>>).map((f) => ({
      id: f.id as string,
      tareaId: f.tarea_id as string,
      titulo: f.titulo as string,
      completada: Boolean(f.completada),
      completadaEn: (f.completada_en as string | null) ?? null,
      completadaPor: (f.completada_por as string | null) ?? null,
      orden: num(f.orden as number | string | null),
      fechaCreacion: f.fecha_creacion as string,
    }));
  }

  async crearSubtarea(
    tareaId: string,
    input: SubtareaInput,
  ): Promise<Subtarea> {
    const { data, error } = await this.sb
      .from("subtareas")
      .insert({
        tarea_id: tareaId,
        titulo: input.titulo.trim(),
        orden: input.orden,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const f = data as Record<string, unknown>;
    return {
      id: f.id as string,
      tareaId: f.tarea_id as string,
      titulo: f.titulo as string,
      completada: Boolean(f.completada),
      completadaEn: (f.completada_en as string | null) ?? null,
      completadaPor: (f.completada_por as string | null) ?? null,
      orden: num(f.orden as number | string | null),
      fechaCreacion: f.fecha_creacion as string,
    };
  }

  async actualizarSubtarea(
    id: string,
    cambios: Partial<{ titulo: string; completada: boolean; orden: number }>,
  ): Promise<Subtarea> {
    const fila: Record<string, unknown> = {};
    if (cambios.titulo !== undefined) fila.titulo = cambios.titulo.trim();
    if (cambios.orden !== undefined) fila.orden = cambios.orden;
    if (cambios.completada !== undefined) {
      fila.completada = cambios.completada;
      fila.completada_en = cambios.completada ? new Date().toISOString() : null;
      const u = await getUsuarioActual();
      fila.completada_por = cambios.completada ? (u?.id ?? null) : null;
    }
    const { data, error } = await this.sb
      .from("subtareas")
      .update(fila)
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const f = data as Record<string, unknown>;
    return {
      id: f.id as string,
      tareaId: f.tarea_id as string,
      titulo: f.titulo as string,
      completada: Boolean(f.completada),
      completadaEn: (f.completada_en as string | null) ?? null,
      completadaPor: (f.completada_por as string | null) ?? null,
      orden: num(f.orden as number | string | null),
      fechaCreacion: f.fecha_creacion as string,
    };
  }

  async eliminarSubtarea(id: string): Promise<void> {
    const { error } = await this.sb.from("subtareas").delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Comentarios de tareas

  async listComentarios(): Promise<ComentarioTarea[]> {
    const { data, error } = await this.sb
      .from("comentarios_tarea")
      .select("id, tarea_id, autor_id, contenido, fecha_creacion, fecha_actualizacion")
      .order("fecha_creacion", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as Array<Record<string, unknown>>).map((f) => ({
      id: f.id as string,
      tareaId: f.tarea_id as string,
      autorId: f.autor_id as string,
      contenido: f.contenido as string,
      fechaCreacion: f.fecha_creacion as string,
      fechaActualizacion: f.fecha_actualizacion as string,
    }));
  }

  async crearComentario(
    tareaId: string,
    contenido: string,
  ): Promise<ComentarioTarea> {
    const { data, error } = await this.sb
      .from("comentarios_tarea")
      .insert({ tarea_id: tareaId, contenido: contenido.trim() })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const f = data as Record<string, unknown>;
    return {
      id: f.id as string,
      tareaId: f.tarea_id as string,
      autorId: f.autor_id as string,
      contenido: f.contenido as string,
      fechaCreacion: f.fecha_creacion as string,
      fechaActualizacion: f.fecha_actualizacion as string,
    };
  }

  async eliminarComentario(id: string): Promise<void> {
    const { error } = await this.sb
      .from("comentarios_tarea")
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Actividad de tareas

  async listActividadTarea(): Promise<ActividadTarea[]> {
    const { data, error } = await this.sb
      .from("actividad_tarea")
      .select("id, tarea_id, actor_id, accion, valores_previos, valores_nuevos, fecha_creacion")
      .order("fecha_creacion", { ascending: false })
      .limit(500);
    if (error) throw new Error(error.message);
    return (data as Array<Record<string, unknown>>).map((f) => ({
      id: f.id as string,
      tareaId: (f.tarea_id as string | null) ?? null,
      actorId: (f.actor_id as string | null) ?? null,
      accion: f.accion as string,
      valoresPrevios:
        (f.valores_previos as Record<string, unknown> | null) ?? null,
      valoresNuevos:
        (f.valores_nuevos as Record<string, unknown> | null) ?? null,
      fechaCreacion: f.fecha_creacion as string,
    }));
  }

  // Notificaciones

  async listNotificaciones(): Promise<Notificacion[]> {
    const { data, error } = await this.sb
      .from("notificaciones")
      .select("id, tipo, titulo, mensaje, tarea_id, leida_en, fecha_creacion")
      .order("fecha_creacion", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data as Array<Record<string, unknown>>).map((f) => ({
      id: f.id as string,
      tipo: f.tipo as string,
      titulo: f.titulo as string,
      mensaje: (f.mensaje as string | null) ?? "",
      tareaId: (f.tarea_id as string | null) ?? null,
      leidaEn: (f.leida_en as string | null) ?? null,
      fechaCreacion: f.fecha_creacion as string,
    }));
  }

  async marcarNotificacion(id: string, leida: boolean): Promise<void> {
    const { error } = await this.sb
      .from("notificaciones")
      .update({ leida_en: leida ? new Date().toISOString() : null })
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  async marcarTodasNotificaciones(): Promise<void> {
    const { error } = await this.sb
      .from("notificaciones")
      .update({ leida_en: new Date().toISOString() })
      .is("leida_en", null);
    if (error) throw new Error(error.message);
  }

  // Equipo

  async listMiembrosEquipo(): Promise<MiembroEquipo[]> {
    const [miembros, perfiles] = await Promise.all([
      this.sb
        .from("miembros_organizacion")
        .select("user_id, correo, rol")
        .order("fecha_creacion", { ascending: true }),
      this.sb.from(SUPABASE_TABLE_PERFILES).select("user_id, nombre"),
    ]);
    if (miembros.error) throw new Error(miembros.error.message);
    const nombres = new Map<string, string>();
    for (const p of (perfiles.data ?? []) as Array<Record<string, unknown>>) {
      nombres.set(p.user_id as string, (p.nombre as string | null) ?? "");
    }
    return (miembros.data as Array<Record<string, unknown>>).map((m) => ({
      userId: m.user_id as string,
      correo: (m.correo as string | null) ?? "",
      rol: (m.rol as RolPerfil) ?? "miembro",
      nombre:
        (nombres.get(m.user_id as string) || "").trim() ||
        ((m.correo as string | null) ?? "").split("@")[0] ||
        "Usuario",
    }));
  }

  async notificarMencion(tareaId: string, userId: string): Promise<void> {
    const { error } = await this.sb.rpc("notificar_mencion", {
      p_tarea: tareaId,
      p_user: userId,
    });
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

  // Bitácora

  async listBitacora(limite = 200): Promise<EntradaBitacora[]> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_BITACORA)
      .select("*")
      .order("fecha", { ascending: false })
      .limit(limite);
    if (error) throw new Error(error.message);
    return (data as FilaBitacora[]).map((f) => ({
      id: f.id,
      entidad: f.entidad,
      entidadId: f.entidad_id,
      accion: f.accion,
      resumen: f.resumen ?? "",
      fecha: f.fecha,
    }));
  }

  async registrarBitacora(entrada: NuevaEntradaBitacora): Promise<void> {
    const { error } = await this.sb.from(SUPABASE_TABLE_BITACORA).insert({
      entidad: entrada.entidad,
      entidad_id: entrada.entidadId,
      accion: entrada.accion,
      resumen: entrada.resumen,
    });
    if (error) throw new Error(error.message);
  }

  // Estados de oportunidad

  async listEstados(): Promise<EstadoOportunidad[]> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_ESTADOS)
      .select("*")
      .order("orden", { ascending: true });
    if (error) throw new Error(error.message);
    return (
      data as Array<{
        clave: EstadoOportunidad["clave"];
        etiqueta: string;
        color: string | null;
        orden: number | string | null;
        fecha_creacion: string;
        fecha_actualizacion: string;
      }>
    ).map((f) => ({
      clave: f.clave,
      etiqueta: f.etiqueta,
      color: f.color ?? "#64748B",
      orden: num(f.orden),
      fechaCreacion: f.fecha_creacion,
      fechaActualizacion: f.fecha_actualizacion,
    }));
  }

  async guardarEstado(
    input: EstadoOportunidadInput,
  ): Promise<EstadoOportunidad> {
    const u = await getUsuarioActual();
    if (!u?.id) throw new Error("No hay una sesión activa.");
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_ESTADOS)
      .upsert(
        {
          user_id: u.id,
          clave: input.clave,
          etiqueta: input.etiqueta.trim(),
          color: input.color,
          orden: input.orden,
        },
        { onConflict: "user_id,clave" },
      )
      .select()
      .single();
    if (error) throw new Error(error.message);
    const f = data as {
      clave: EstadoOportunidad["clave"];
      etiqueta: string;
      color: string | null;
      orden: number | string | null;
      fecha_creacion: string;
      fecha_actualizacion: string;
    };
    return {
      clave: f.clave,
      etiqueta: f.etiqueta,
      color: f.color ?? "#64748B",
      orden: num(f.orden),
      fechaCreacion: f.fecha_creacion,
      fechaActualizacion: f.fecha_actualizacion,
    };
  }
}

export const fase2SupabaseRepository = new Fase2SupabaseRepository();
