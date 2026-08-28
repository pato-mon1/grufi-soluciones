import type {
  Actividad,
  Contacto,
  ContactoInput,
  Empresa,
  EmpresaInput,
  NuevaActividad,
} from "@/lib/types";

/**
 * Contrato de acceso a datos. Cualquier backend (localStorage, Supabase...)
 * implementa esta interfaz para que la UI funcione sin cambios.
 */
export interface EmpresaRepository {
  /** Nombre legible del backend, para diagnóstico. */
  readonly nombre: string;

  // ── Empresas ──
  list(): Promise<Empresa[]>;
  create(input: EmpresaInput): Promise<Empresa>;
  bulkCreate(inputs: EmpresaInput[]): Promise<Empresa[]>;
  update(id: string, cambios: Partial<EmpresaInput>): Promise<Empresa>;
  remove(id: string): Promise<void>;

  // ── Contactos ──
  listContactos(): Promise<Contacto[]>;
  crearContacto(empresaId: string, input: ContactoInput): Promise<Contacto>;
  actualizarContacto(
    id: string,
    cambios: Partial<ContactoInput>,
  ): Promise<Contacto>;
  eliminarContacto(id: string): Promise<void>;

  // ── Actividades (historial, solo se agregan) ──
  listActividades(): Promise<Actividad[]>;
  crearActividad(input: NuevaActividad): Promise<Actividad>;
}
