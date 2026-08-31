import type {
  AjustesApp,
  CategoriaFinanza,
  CategoriaFinanzaInput,
  EntradaBitacora,
  EventoCalendario,
  EventoInput,
  MovimientoFinanciero,
  MovimientoInput,
  NuevaEntradaBitacora,
  Perfil,
  PerfilInput,
  Tarea,
  TareaInput,
} from "@/lib/types";
import type {
  EstadoOportunidad,
  EstadoOportunidadInput,
} from "@/lib/estados";

/**
 * Contrato de acceso a datos de los módulos de la Fase 2
 * (Tareas, Finanzas, Calendario, Configuración).
 *
 * Igual que `EmpresaRepository`, lo implementan tanto el backend de
 * `localStorage` como el de Supabase, para que la UI no dependa del origen.
 */
export interface Fase2Repository {
  readonly nombre: string;

  // ── Tareas ──
  listTareas(): Promise<Tarea[]>;
  crearTarea(input: TareaInput): Promise<Tarea>;
  actualizarTarea(id: string, cambios: Partial<TareaInput>): Promise<Tarea>;
  eliminarTarea(id: string): Promise<void>;

  // ── Categorías de finanzas ──
  listCategorias(): Promise<CategoriaFinanza[]>;
  crearCategoria(input: CategoriaFinanzaInput): Promise<CategoriaFinanza>;
  actualizarCategoria(
    id: string,
    cambios: Partial<CategoriaFinanzaInput>,
  ): Promise<CategoriaFinanza>;
  eliminarCategoria(id: string): Promise<void>;

  // ── Movimientos financieros ──
  listMovimientos(): Promise<MovimientoFinanciero[]>;
  crearMovimiento(input: MovimientoInput): Promise<MovimientoFinanciero>;
  actualizarMovimiento(
    id: string,
    cambios: Partial<MovimientoInput>,
  ): Promise<MovimientoFinanciero>;
  eliminarMovimiento(id: string): Promise<void>;

  // ── Eventos de calendario ──
  listEventos(): Promise<EventoCalendario[]>;
  crearEvento(input: EventoInput): Promise<EventoCalendario>;
  actualizarEvento(
    id: string,
    cambios: Partial<EventoInput>,
  ): Promise<EventoCalendario>;
  eliminarEvento(id: string): Promise<void>;

  // ── Perfil del usuario ──
  obtenerPerfil(): Promise<Perfil | null>;
  guardarPerfil(input: PerfilInput): Promise<Perfil>;

  // ── Ajustes de la aplicación ──
  obtenerAjustes(): Promise<AjustesApp>;
  guardarAjustes(ajustes: AjustesApp): Promise<AjustesApp>;

  // ── Bitácora (auditoría, solo se agregan entradas) ──
  listBitacora(limite?: number): Promise<EntradaBitacora[]>;
  registrarBitacora(entrada: NuevaEntradaBitacora): Promise<void>;

  // ── Personalización de estados de oportunidad ──
  listEstados(): Promise<EstadoOportunidad[]>;
  guardarEstado(input: EstadoOportunidadInput): Promise<EstadoOportunidad>;
}
