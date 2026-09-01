import type {
  ActividadTarea,
  AjustesApp,
  CategoriaFinanza,
  CategoriaFinanzaInput,
  ComentarioTarea,
  EntradaBitacora,
  EventoCalendario,
  EventoInput,
  MiembroEquipo,
  MovimientoFinanciero,
  MovimientoInput,
  Notificacion,
  NuevaEntradaBitacora,
  Perfil,
  PerfilInput,
  Subtarea,
  SubtareaInput,
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

  // ── Subtareas ──
  listSubtareas(): Promise<Subtarea[]>;
  crearSubtarea(tareaId: string, input: SubtareaInput): Promise<Subtarea>;
  actualizarSubtarea(
    id: string,
    cambios: Partial<{ titulo: string; completada: boolean; orden: number }>,
  ): Promise<Subtarea>;
  eliminarSubtarea(id: string): Promise<void>;

  // ── Comentarios de tareas ──
  listComentarios(): Promise<ComentarioTarea[]>;
  crearComentario(tareaId: string, contenido: string): Promise<ComentarioTarea>;
  eliminarComentario(id: string): Promise<void>;

  // ── Actividad de tareas (solo lectura) ──
  listActividadTarea(): Promise<ActividadTarea[]>;

  // ── Notificaciones ──
  listNotificaciones(): Promise<Notificacion[]>;
  marcarNotificacion(id: string, leida: boolean): Promise<void>;
  marcarTodasNotificaciones(): Promise<void>;

  // ── Equipo (para el selector de responsables y la página Equipo) ──
  listMiembrosEquipo(): Promise<MiembroEquipo[]>;
  /** Notifica una @mención (no-op en modo local). */
  notificarMencion(tareaId: string, userId: string): Promise<void>;

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
