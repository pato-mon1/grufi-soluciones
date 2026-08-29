import {
  SUPABASE_TABLE,
  SUPABASE_TABLE_ACTIVIDADES,
  SUPABASE_TABLE_CONTACTOS,
} from "@/lib/constants";
import { getSupabaseClient, getUsuarioActual } from "@/lib/supabase/client";
import type {
  Actividad,
  Contacto,
  ContactoInput,
  Empresa,
  EmpresaInput,
  EstadoEmpresa,
  NuevaActividad,
  TipoActividad,
} from "@/lib/types";
import type { EmpresaRepository } from "@/lib/repository/types";

// ── Filas de la base de datos (snake_case) ──────────────────

interface FilaEmpresa {
  id: string;
  nombre: string;
  estado: EstadoEmpresa;
  monto_resultado: number | string | null;
  notas: string | null;
  fecha_ultimo_contacto: string | null;
  fecha_proximo_seguimiento: string | null;
  requiere_seguimiento: boolean | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface FilaContacto {
  id: string;
  empresa_id: string;
  nombre: string | null;
  puesto: string | null;
  telefono: string | null;
  correo: string | null;
  principal: boolean | null;
  fecha_creacion: string;
  fecha_actualizacion: string;
}

interface FilaActividad {
  id: string;
  empresa_id: string;
  tipo: TipoActividad;
  fecha_hora: string;
  descripcion: string | null;
  usuario: string | null;
  fecha_creacion: string;
}

// ── Mapeadores ──────────────────────────────────────────────

function aMonto(valor: number | string | null): number | null {
  if (valor === null || valor === "") return null;
  const n = typeof valor === "number" ? valor : Number(valor);
  return Number.isFinite(n) ? n : null;
}

function aEmpresa(f: FilaEmpresa): Empresa {
  return {
    id: f.id,
    nombre: f.nombre,
    estado: f.estado,
    montoResultado: aMonto(f.monto_resultado),
    notas: f.notas ?? "",
    fechaUltimoContacto: f.fecha_ultimo_contacto,
    fechaProximoSeguimiento: f.fecha_proximo_seguimiento,
    requiereSeguimiento: f.requiere_seguimiento ?? false,
    fechaCreacion: f.fecha_creacion,
    fechaActualizacion: f.fecha_actualizacion,
  };
}

function empresaAFila(input: Partial<EmpresaInput>): Record<string, unknown> {
  const fila: Record<string, unknown> = {};
  if (input.nombre !== undefined) fila.nombre = input.nombre.trim();
  if (input.estado !== undefined) fila.estado = input.estado;
  if (input.montoResultado !== undefined)
    fila.monto_resultado = input.montoResultado;
  if (input.notas !== undefined) fila.notas = input.notas;
  if (input.fechaUltimoContacto !== undefined)
    fila.fecha_ultimo_contacto = input.fechaUltimoContacto;
  if (input.fechaProximoSeguimiento !== undefined)
    fila.fecha_proximo_seguimiento = input.fechaProximoSeguimiento;
  if (input.requiereSeguimiento !== undefined)
    fila.requiere_seguimiento = input.requiereSeguimiento;
  return fila;
}

function aContacto(f: FilaContacto): Contacto {
  return {
    id: f.id,
    empresaId: f.empresa_id,
    nombre: f.nombre ?? "",
    puesto: f.puesto ?? "",
    telefono: f.telefono ?? "",
    correo: f.correo ?? "",
    principal: f.principal ?? false,
    fechaCreacion: f.fecha_creacion,
    fechaActualizacion: f.fecha_actualizacion,
  };
}

function contactoAFila(input: Partial<ContactoInput>): Record<string, unknown> {
  const fila: Record<string, unknown> = {};
  if (input.nombre !== undefined) fila.nombre = input.nombre.trim();
  if (input.puesto !== undefined) fila.puesto = input.puesto.trim();
  if (input.telefono !== undefined) fila.telefono = input.telefono.trim();
  if (input.correo !== undefined) fila.correo = input.correo.trim();
  if (input.principal !== undefined) fila.principal = input.principal;
  return fila;
}

function aActividad(f: FilaActividad): Actividad {
  return {
    id: f.id,
    empresaId: f.empresa_id,
    tipo: f.tipo,
    fechaHora: f.fecha_hora,
    descripcion: f.descripcion ?? "",
    fechaCreacion: f.fecha_creacion,
    usuario: f.usuario ?? "",
  };
}

// El `user_id` de cada fila lo pone la base de datos con `default auth.uid()`
// (ver supabase/schema.sql); por eso los INSERT ya no lo envían ni consultan
// el usuario en cada operación.

// ── Repositorio ─────────────────────────────────────────────

class SupabaseRepository implements EmpresaRepository {
  readonly nombre = "Supabase";

  private get sb() {
    return getSupabaseClient();
  }

  // Empresas

  async list(): Promise<Empresa[]> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE)
      .select("*")
      .order("fecha_creacion", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as FilaEmpresa[]).map(aEmpresa);
  }

  async create(input: EmpresaInput): Promise<Empresa> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE)
      .insert(empresaAFila(input))
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aEmpresa(data as FilaEmpresa);
  }

  async bulkCreate(inputs: EmpresaInput[]): Promise<Empresa[]> {
    if (inputs.length === 0) return [];
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE)
      .insert(inputs.map((i) => empresaAFila(i)))
      .select();
    if (error) throw new Error(error.message);
    return (data as FilaEmpresa[]).map(aEmpresa);
  }

  async update(id: string, cambios: Partial<EmpresaInput>): Promise<Empresa> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE)
      .update(empresaAFila(cambios))
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aEmpresa(data as FilaEmpresa);
  }

  async remove(id: string): Promise<void> {
    // Contactos y actividades se borran en cascada (ON DELETE CASCADE).
    const { error } = await this.sb.from(SUPABASE_TABLE).delete().eq("id", id);
    if (error) throw new Error(error.message);
  }

  // Contactos

  async listContactos(): Promise<Contacto[]> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_CONTACTOS)
      .select("*")
      .order("fecha_creacion", { ascending: true });
    if (error) throw new Error(error.message);
    return (data as FilaContacto[]).map(aContacto);
  }

  async crearContacto(
    empresaId: string,
    input: ContactoInput,
  ): Promise<Contacto> {
    if (input.principal) await this.desmarcarPrincipales(empresaId);
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_CONTACTOS)
      .insert({ ...contactoAFila(input), empresa_id: empresaId })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aContacto(data as FilaContacto);
  }

  async actualizarContacto(
    id: string,
    cambios: Partial<ContactoInput>,
  ): Promise<Contacto> {
    // Si se marca como principal, primero se quita al resto de la empresa.
    if (cambios.principal) {
      const { data: actual } = await this.sb
        .from(SUPABASE_TABLE_CONTACTOS)
        .select("empresa_id")
        .eq("id", id)
        .single();
      const empresaId = (actual as { empresa_id?: string } | null)?.empresa_id;
      if (empresaId) await this.desmarcarPrincipales(empresaId, id);
    }
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_CONTACTOS)
      .update(contactoAFila(cambios))
      .eq("id", id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aContacto(data as FilaContacto);
  }

  async eliminarContacto(id: string): Promise<void> {
    const { error } = await this.sb
      .from(SUPABASE_TABLE_CONTACTOS)
      .delete()
      .eq("id", id);
    if (error) throw new Error(error.message);
  }

  private async desmarcarPrincipales(
    empresaId: string,
    exceptoId?: string,
  ): Promise<void> {
    let q = this.sb
      .from(SUPABASE_TABLE_CONTACTOS)
      .update({ principal: false })
      .eq("empresa_id", empresaId)
      .eq("principal", true);
    if (exceptoId) q = q.neq("id", exceptoId);
    const { error } = await q;
    if (error) throw new Error(error.message);
  }

  // Actividades

  async listActividades(): Promise<Actividad[]> {
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_ACTIVIDADES)
      .select("*")
      .order("fecha_hora", { ascending: false });
    if (error) throw new Error(error.message);
    return (data as FilaActividad[]).map(aActividad);
  }

  async crearActividad(input: NuevaActividad): Promise<Actividad> {
    const u = await getUsuarioActual();
    const { data, error } = await this.sb
      .from(SUPABASE_TABLE_ACTIVIDADES)
      .insert({
        empresa_id: input.empresaId,
        tipo: input.tipo,
        fecha_hora: input.fechaHora,
        descripcion: input.descripcion.trim(),
        usuario: u?.email ?? "",
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return aActividad(data as FilaActividad);
  }
}

export const supabaseRepository = new SupabaseRepository();
