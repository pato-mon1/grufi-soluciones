"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  CalendarClock,
  CalendarDays,
  Columns3,
  List,
  Plus,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PageHeader } from "@/components/app-shell/page-header";
import { Avatar } from "@/components/tareas/selector-usuario";
import { TareaFormDialog } from "@/components/tareas/tarea-form-dialog";
import { PanelDetalleTarea } from "@/components/tareas/panel-detalle-tarea";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { useTareasColab } from "@/lib/hooks/use-tareas-colab";
import { usePermisos } from "@/lib/hooks/use-permisos";
import { formatearFecha, formatearFechaHora } from "@/lib/date";
import {
  diasDelMes,
  etiquetasDiasSemana,
  nombreMes,
  desplazarMes,
} from "@/lib/calendario";
import {
  COLUMNAS_TAREA,
  ETIQUETA_PRIORIDAD,
  agruparPorEstado,
  completadaEstaSemana,
  resumirTareas,
  siguienteOrden,
  tareaVencida,
} from "@/lib/tareas";
import {
  describirActividad,
  TIPOS_ACTIVIDAD_TAREA,
} from "@/lib/actividad-tarea";
import {
  ETIQUETA_ESTADO_TAREA,
  PRIORIDADES_TAREA,
  type ActividadTarea,
  type EstadoTarea,
  type PrioridadTarea,
  type Tarea,
  type TareaInput,
} from "@/lib/types";

type Pestana = "panel" | "mias" | "equipo" | "actividad";
type Vista = "kanban" | "lista" | "calendario";

const PRIORIDAD_CLASE: Record<PrioridadTarea, string> = {
  alta: "bg-estado-perdida/12 text-estado-perdida-fg",
  media: "bg-estado-platicas-suave text-estado-platicas-fg",
  baja: "bg-muted text-muted-foreground",
};

interface Filtros {
  responsable: string;
  empresa: string;
  estado: string;
  prioridad: string;
  creador: string;
  desde: string;
  hasta: string;
  busqueda: string;
}

const FILTROS_VACIOS: Filtros = {
  responsable: "todos",
  empresa: "todas",
  estado: "todos",
  prioridad: "todas",
  creador: "todos",
  desde: "",
  hasta: "",
  busqueda: "",
};

export function TareasView() {
  const router = useRouter();
  const params = useSearchParams();
  const { empresas, contactos } = useEmpresas();
  const {
    tareas,
    miembrosEquipo,
    perfil,
    cargando,
    procesando,
    crearTarea,
    actualizarTarea,
    moverTarea,
    eliminarTarea,
  } = useFase2();
  const colab = useTareasColab();
  const { puede } = usePermisos();
  const puedeEditarTareas = puede("tareas", "edit");

  const soyAdmin =
    miembrosEquipo.length === 0 ||
    perfil?.rol === "admin" ||
    miembrosEquipo.find((m) => m.userId === colab.miUserId)?.rol === "admin";

  const nombreDe = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of miembrosEquipo) m.set(x.userId, x.nombre);
    return (id: string | null | undefined) =>
      (id && (m.get(id) || (id === "local" ? "Yo" : null))) || "Alguien";
  }, [miembrosEquipo]);

  const nombreEmpresa = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of empresas) m.set(e.id, e.nombre);
    return m;
  }, [empresas]);

  const [pestana, setPestana] = useState<Pestana>("panel");
  const [vista, setVista] = useState<Vista>("kanban");
  const [filtros, setFiltros] = useState<Filtros>(FILTROS_VACIOS);
  const [formAbierto, setFormAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Tarea | null>(null);
  const [presetEstado, setPresetEstado] = useState<EstadoTarea>("por_hacer");
  const [aEliminar, setAEliminar] = useState<Tarea | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);

  // Abre el detalle si viene ?tarea=<id> (desde una notificación).
  useEffect(() => {
    const t = params.get("tarea");
    if (t) setDetalleId(t);
  }, [params]);

  const detalle = detalleId
    ? (tareas.find((t) => t.id === detalleId) ?? null)
    : null;

  function setF<K extends keyof Filtros>(k: K, v: Filtros[K]) {
    setFiltros((p) => ({ ...p, [k]: v }));
  }

  const base = useMemo(() => {
    const q = filtros.busqueda.trim().toLowerCase();
    return tareas.filter((t) => {
      if (filtros.responsable === "sin" && t.asignadoA) return false;
      if (
        filtros.responsable !== "todos" &&
        filtros.responsable !== "sin" &&
        t.asignadoA !== filtros.responsable
      )
        return false;
      if (filtros.empresa !== "todas" && t.empresaId !== filtros.empresa)
        return false;
      if (filtros.estado !== "todos" && t.estado !== filtros.estado)
        return false;
      if (filtros.prioridad !== "todas" && t.prioridad !== filtros.prioridad)
        return false;
      if (filtros.creador !== "todos" && t.creadoPor !== filtros.creador)
        return false;
      if (filtros.desde && (t.fechaLimite ?? "") < filtros.desde) return false;
      if (filtros.hasta && (t.fechaLimite ?? "￿") > filtros.hasta)
        return false;
      if (q) {
        const emp = t.empresaId
          ? (nombreEmpresa.get(t.empresaId) ?? "")
          : "";
        const resp = nombreDe(t.asignadoA);
        if (
          !t.titulo.toLowerCase().includes(q) &&
          !emp.toLowerCase().includes(q) &&
          !resp.toLowerCase().includes(q)
        )
          return false;
      }
      return true;
    });
  }, [tareas, filtros, nombreEmpresa, nombreDe]);

  const mias = useMemo(
    () => base.filter((t) => t.asignadoA === colab.miUserId),
    [base, colab.miUserId],
  );

  const lista = pestana === "mias" ? mias : base;
  const resumen = useMemo(() => resumirTareas(lista), [lista]);

  function abrirNueva(estado: EstadoTarea) {
    setEnEdicion(null);
    setPresetEstado(estado);
    setFormAbierto(true);
  }

  async function guardarForm(datos: TareaInput) {
    if (enEdicion) {
      await actualizarTarea(enEdicion.id, datos);
    } else {
      await crearTarea({
        ...datos,
        orden: siguienteOrden(tareas, datos.estado),
      });
    }
    setFormAbierto(false);
    setEnEdicion(null);
  }

  const indicadores = [
    { etiqueta: "Pendientes", valor: resumen.pendientes },
    { etiqueta: "En curso", valor: resumen.enCurso },
    { etiqueta: "Vencidas", valor: resumen.vencidas, alerta: true },
    { etiqueta: "Para hoy", valor: resumen.paraHoy },
    { etiqueta: "Hechas (7 días)", valor: resumen.completadasSemana },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Tareas"
        subtitle="Panel colaborativo del equipo."
        action={
          puedeEditarTareas ? (
            <Button
              className="w-full sm:w-auto"
              onClick={() => abrirNueva("por_hacer")}
            >
              <Plus className="h-4 w-4 text-champagne" />
              Nueva tarea
            </Button>
          ) : undefined
        }
      />

      {/* Pestañas */}
      <div className="flex flex-wrap gap-1 rounded-md border p-1 text-sm">
        {(
          [
            ["panel", "Panel general"],
            ["mias", "Mis tareas"],
            ["equipo", "Equipo"],
            ["actividad", "Actividad"],
          ] as [Pestana, string][]
        ).map(([id, etq]) => (
          <button
            key={id}
            type="button"
            onClick={() => setPestana(id)}
            className={cn(
              "rounded px-3 py-1.5 transition-colors",
              pestana === id
                ? "bg-accent font-medium text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {etq}
          </button>
        ))}
      </div>

      {pestana === "equipo" ? (
        <PestanaEquipo
          tareas={base}
          miembros={miembrosEquipo}
          onAbrirTarea={(id) => setDetalleId(id)}
        />
      ) : pestana === "actividad" ? (
        <PestanaActividad
          actividad={colab.actividad}
          tareas={tareas}
          miembros={miembrosEquipo}
          empresasNombre={nombreEmpresa}
          nombreDe={nombreDe}
          onAbrirTarea={(id) => setDetalleId(id)}
        />
      ) : (
        <>
          {/* Indicadores */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {indicadores.map((ind) => (
              <Card key={ind.etiqueta} className="p-3">
                {cargando ? (
                  <Skeleton className="h-7 w-10" />
                ) : (
                  <p
                    className={cn(
                      "text-2xl font-semibold tracking-tight",
                      ind.alerta && ind.valor > 0 && "text-estado-perdida",
                    )}
                  >
                    {ind.valor}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">{ind.etiqueta}</p>
              </Card>
            ))}
          </div>

          {/* Filtros + vista */}
          <Card className="space-y-3 p-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[180px] flex-1">
                <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={filtros.busqueda}
                  onChange={(e) => setF("busqueda", e.target.value)}
                  placeholder="Buscar tarea, empresa o colaborador"
                  className="h-9 pl-8"
                />
              </div>
              <FiltroSelect
                valor={filtros.responsable}
                onChange={(v) => setF("responsable", v)}
                aria="Responsable"
                opciones={[
                  ["todos", "Responsable: todos"],
                  ["sin", "Sin asignar"],
                  ...miembrosEquipo.map(
                    (m) => [m.userId, m.nombre] as [string, string],
                  ),
                ]}
              />
              <FiltroSelect
                valor={filtros.empresa}
                onChange={(v) => setF("empresa", v)}
                aria="Empresa"
                opciones={[
                  ["todas", "Empresa: todas"],
                  ...empresas.map((e) => [e.id, e.nombre] as [string, string]),
                ]}
              />
              <FiltroSelect
                valor={filtros.estado}
                onChange={(v) => setF("estado", v)}
                aria="Estado"
                opciones={[
                  ["todos", "Estado: todos"],
                  ...COLUMNAS_TAREA.map(
                    (c) => [c.estado, c.etiqueta] as [string, string],
                  ),
                ]}
              />
              <FiltroSelect
                valor={filtros.prioridad}
                onChange={(v) => setF("prioridad", v)}
                aria="Prioridad"
                opciones={[
                  ["todas", "Prioridad: todas"],
                  ...PRIORIDADES_TAREA.map(
                    (p) => [p, ETIQUETA_PRIORIDAD[p]] as [string, string],
                  ),
                ]}
              />
              <FiltroSelect
                valor={filtros.creador}
                onChange={(v) => setF("creador", v)}
                aria="Creador"
                opciones={[
                  ["todos", "Creador: todos"],
                  ...miembrosEquipo.map(
                    (m) => [m.userId, m.nombre] as [string, string],
                  ),
                ]}
              />
              <label className="flex items-center gap-1 text-xs text-muted-foreground">
                Límite
                <Input
                  type="date"
                  value={filtros.desde}
                  onChange={(e) => setF("desde", e.target.value)}
                  className="h-9 w-[130px]"
                  aria-label="Fecha límite desde"
                />
                <span>–</span>
                <Input
                  type="date"
                  value={filtros.hasta}
                  onChange={(e) => setF("hasta", e.target.value)}
                  className="h-9 w-[130px]"
                  aria-label="Fecha límite hasta"
                />
              </label>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFiltros(FILTROS_VACIOS)}
              >
                Limpiar
              </Button>
            </div>

            <div className="flex gap-1 rounded-md border p-0.5 text-sm sm:w-fit">
              {(
                [
                  ["kanban", "Kanban", Columns3],
                  ["lista", "Lista", List],
                  ["calendario", "Calendario", CalendarDays],
                ] as [Vista, string, typeof List][]
              ).map(([id, etq, Icono]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setVista(id)}
                  className={cn(
                    "flex items-center gap-1.5 rounded px-3 py-1 transition-colors",
                    vista === id
                      ? "bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icono className="h-4 w-4" />
                  {etq}
                </button>
              ))}
            </div>
          </Card>

          {cargando ? (
            <Skeleton className="h-96 w-full" />
          ) : vista === "kanban" ? (
            <TableroKanban
              tareas={lista}
              nombreDe={nombreDe}
              onMover={moverTarea}
              onAbrir={(id) => setDetalleId(id)}
              onNueva={abrirNueva}
            />
          ) : vista === "lista" ? (
            <ListaTareas
              tareas={lista}
              nombreDe={nombreDe}
              empresaNombre={nombreEmpresa}
              onAbrir={(id) => setDetalleId(id)}
            />
          ) : (
            <CalendarioTareas
              tareas={lista}
              onAbrir={(id) => setDetalleId(id)}
            />
          )}
        </>
      )}

      <TareaFormDialog
        abierto={formAbierto}
        tarea={enEdicion}
        preset={{ estado: presetEstado }}
        empresas={empresas.map((e) => ({ id: e.id, nombre: e.nombre }))}
        contactos={contactos}
        miembros={miembrosEquipo}
        procesando={procesando}
        onOpenChange={(v) => {
          setFormAbierto(v);
          if (!v) setEnEdicion(null);
        }}
        onGuardar={guardarForm}
      />

      {detalle && (
        <PanelDetalleTarea
          tarea={detalle}
          abierta={detalleId !== null}
          onOpenChange={(v) => {
            if (!v) {
              setDetalleId(null);
              if (params.get("tarea")) router.replace("/tareas");
            }
          }}
          miembros={miembrosEquipo}
          empresaNombre={
            detalle.empresaId
              ? (nombreEmpresa.get(detalle.empresaId) ?? null)
              : null
          }
          miUserId={puedeEditarTareas ? colab.miUserId : null}
          soyAdmin={Boolean(soyAdmin) && puedeEditarTareas}
          subtareas={colab.subtareas}
          comentarios={colab.comentarios}
          actividad={colab.actividad}
          procesando={procesando}
          onActualizar={(cambios) => actualizarTarea(detalle.id, cambios).then(() => {})}
          onEditar={() => {
            setEnEdicion(detalle);
            setFormAbierto(true);
          }}
          onEliminar={() => setAEliminar(detalle)}
          onCrearSubtarea={(t) => colab.crearSubtarea(detalle.id, t)}
          onAlternarSubtarea={colab.alternarSubtarea}
          onEliminarSubtarea={colab.eliminarSubtarea}
          onCrearComentario={(c, m) => colab.crearComentario(detalle.id, c, m)}
          onEliminarComentario={colab.eliminarComentario}
        />
      )}

      <Dialog
        open={aEliminar !== null}
        onOpenChange={(v) => !v && setAEliminar(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar tarea</DialogTitle>
            <DialogDescription>
              Se eliminará “{aEliminar?.titulo}” con sus subtareas y comentarios.
              No se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAEliminar(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={procesando}
              onClick={async () => {
                if (!aEliminar) return;
                await eliminarTarea(aEliminar.id);
                setAEliminar(null);
                setDetalleId(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ── Filtro select compacto ──────────────────────────────────
function FiltroSelect({
  valor,
  onChange,
  aria,
  opciones,
}: {
  valor: string;
  onChange: (v: string) => void;
  aria: string;
  opciones: [string, string][];
}) {
  return (
    <Select value={valor} onValueChange={onChange}>
      <SelectTrigger className="h-9 w-[170px] text-xs" aria-label={aria}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {opciones.map(([v, etq]) => (
          <SelectItem key={v} value={v} className="text-xs">
            {etq}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

// ── Kanban ──────────────────────────────────────────────────
function TableroKanban({
  tareas,
  nombreDe,
  onMover,
  onAbrir,
  onNueva,
}: {
  tareas: Tarea[];
  nombreDe: (id: string | null) => string;
  onMover: (id: string, estado: EstadoTarea, orden: number) => Promise<void>;
  onAbrir: (id: string) => void;
  onNueva: (estado: EstadoTarea) => void;
}) {
  const grupos = useMemo(() => agruparPorEstado(tareas), [tareas]);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [activa, setActiva] = useState<EstadoTarea | null>(null);

  return (
    <>
      {/* Móvil: lista por columna */}
      <div className="space-y-4 md:hidden">
        {COLUMNAS_TAREA.map((col) => (
          <div key={col.estado}>
            <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
              {col.etiqueta}
              <span className="text-xs text-muted-foreground">
                {grupos[col.estado].length}
              </span>
            </div>
            <div className="space-y-2">
              {grupos[col.estado].map((t) => (
                <TarjetaKanban
                  key={t.id}
                  tarea={t}
                  nombreDe={nombreDe}
                  onAbrir={onAbrir}
                  onMover={onMover}
                  arrastrable={false}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Escritorio: tablero */}
      <div className="hidden gap-4 md:grid md:grid-cols-2 xl:grid-cols-4">
        {COLUMNAS_TAREA.map((col) => (
          <section
            key={col.estado}
            onDragOver={(e) => {
              e.preventDefault();
              setActiva(col.estado);
            }}
            onDragLeave={() =>
              setActiva((c) => (c === col.estado ? null : c))
            }
            onDrop={() => {
              const id = arrastrando;
              setArrastrando(null);
              setActiva(null);
              const t = tareas.find((x) => x.id === id);
              if (id && t && t.estado !== col.estado) {
                void onMover(
                  id,
                  col.estado,
                  siguienteOrden(tareas, col.estado),
                );
              }
            }}
            className={cn(
              "flex flex-col rounded-lg border bg-muted/40 transition-colors",
              activa === col.estado && "border-champagne bg-accent/50",
            )}
          >
            <header className="flex items-center justify-between border-b px-3 py-2">
              <span className="text-sm font-semibold">{col.etiqueta}</span>
              <span className="rounded-full bg-background px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                {grupos[col.estado].length}
              </span>
            </header>
            <div className="flex flex-1 flex-col gap-2 p-2">
              {grupos[col.estado].map((t) => (
                <TarjetaKanban
                  key={t.id}
                  tarea={t}
                  nombreDe={nombreDe}
                  onAbrir={onAbrir}
                  onMover={onMover}
                  arrastrable
                  onDragStart={() => setArrastrando(t.id)}
                  onDragEnd={() => {
                    setArrastrando(null);
                    setActiva(null);
                  }}
                />
              ))}
              <button
                type="button"
                onClick={() => onNueva(col.estado)}
                className="mt-1 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground hover:border-champagne hover:text-foreground"
              >
                + Agregar
              </button>
            </div>
          </section>
        ))}
      </div>
    </>
  );
}

function TarjetaKanban({
  tarea,
  nombreDe,
  onAbrir,
  onMover,
  arrastrable,
  onDragStart,
  onDragEnd,
}: {
  tarea: Tarea;
  nombreDe: (id: string | null) => string;
  onAbrir: (id: string) => void;
  onMover: (id: string, estado: EstadoTarea, orden: number) => Promise<void>;
  arrastrable: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  const vencida = tareaVencida(tarea);
  return (
    <article
      draggable={arrastrable}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="rounded-md border bg-card p-2.5 shadow-card"
    >
      <button
        type="button"
        onClick={() => onAbrir(tarea.id)}
        className="block w-full text-left text-sm font-medium leading-snug hover:text-primary"
      >
        {tarea.titulo}
      </button>
      <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 font-medium",
            PRIORIDAD_CLASE[tarea.prioridad],
          )}
        >
          {ETIQUETA_PRIORIDAD[tarea.prioridad]}
        </span>
        {tarea.fechaLimite && (
          <span
            className={cn(
              "inline-flex items-center gap-1",
              vencida
                ? "font-medium text-estado-perdida"
                : "text-muted-foreground",
            )}
          >
            <CalendarClock className="h-3 w-3" />
            {formatearFecha(tarea.fechaLimite)}
          </span>
        )}
        {tarea.progreso > 0 && tarea.progreso < 100 && (
          <span className="text-muted-foreground">{tarea.progreso}%</span>
        )}
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        {tarea.asignadoA ? (
          <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
            <Avatar
              nombre={nombreDe(tarea.asignadoA)}
              userId={tarea.asignadoA}
            />
            {nombreDe(tarea.asignadoA)}
          </span>
        ) : (
          <span className="text-[11px] text-muted-foreground">Sin asignar</span>
        )}
        <Select
          value={tarea.estado}
          onValueChange={(v) =>
            void onMover(tarea.id, v as EstadoTarea, tarea.orden)
          }
        >
          <SelectTrigger
            className="h-6 w-[118px] text-[11px]"
            aria-label="Mover"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {COLUMNAS_TAREA.map((c) => (
              <SelectItem key={c.estado} value={c.estado} className="text-xs">
                {c.etiqueta}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </article>
  );
}

// ── Lista ───────────────────────────────────────────────────
function ListaTareas({
  tareas,
  nombreDe,
  empresaNombre,
  onAbrir,
}: {
  tareas: Tarea[];
  nombreDe: (id: string | null) => string;
  empresaNombre: Map<string, string>;
  onAbrir: (id: string) => void;
}) {
  if (tareas.length === 0) {
    return (
      <Card className="p-10 text-center text-sm text-muted-foreground">
        Sin tareas que coincidan.
      </Card>
    );
  }
  const orden = [...tareas].sort((a, b) =>
    (a.fechaLimite ?? "￿").localeCompare(b.fechaLimite ?? "￿"),
  );
  return (
    <Card className="divide-y">
      {orden.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onAbrir(t.id)}
          className="flex w-full items-center gap-3 p-3 text-left hover:bg-accent/40"
        >
          <span
            className={cn(
              "h-2 w-2 shrink-0 rounded-full",
              t.estado === "completada"
                ? "bg-estado-ganada"
                : tareaVencida(t)
                  ? "bg-estado-perdida"
                  : "bg-champagne",
            )}
          />
          <span className="min-w-0 flex-1">
            <span
              className={cn(
                "block truncate text-sm font-medium",
                t.estado === "completada" &&
                  "text-muted-foreground line-through",
              )}
            >
              {t.titulo}
            </span>
            <span className="text-xs text-muted-foreground">
              {ETIQUETA_ESTADO_TAREA[t.estado]}
              {t.empresaId && empresaNombre.get(t.empresaId)
                ? ` · ${empresaNombre.get(t.empresaId)}`
                : ""}
              {t.fechaLimite ? ` · ${formatearFecha(t.fechaLimite)}` : ""}
            </span>
          </span>
          <span
            className={cn(
              "shrink-0 rounded-full px-1.5 py-0.5 text-[11px] font-medium",
              PRIORIDAD_CLASE[t.prioridad],
            )}
          >
            {ETIQUETA_PRIORIDAD[t.prioridad]}
          </span>
          {t.asignadoA && (
            <Avatar
              nombre={nombreDe(t.asignadoA)}
              userId={t.asignadoA}
              className="shrink-0"
            />
          )}
        </button>
      ))}
    </Card>
  );
}

// ── Calendario ──────────────────────────────────────────────
function CalendarioTareas({
  tareas,
  onAbrir,
}: {
  tareas: Tarea[];
  onAbrir: (id: string) => void;
}) {
  const hoy = new Date();
  const [anio, setAnio] = useState(hoy.getFullYear());
  const [mes, setMes] = useState(hoy.getMonth());
  const celdas = diasDelMes(anio, mes);
  const porDia = useMemo(() => {
    const m = new Map<string, Tarea[]>();
    for (const t of tareas) {
      if (!t.fechaLimite) continue;
      const arr = m.get(t.fechaLimite);
      if (arr) arr.push(t);
      else m.set(t.fechaLimite, [t]);
    }
    return m;
  }, [tareas]);

  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between gap-2 border-b p-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const d = desplazarMes(anio, mes, -1);
            setAnio(d.anio);
            setMes(d.mes);
          }}
        >
          ‹
        </Button>
        <span className="text-sm font-medium capitalize">
          {nombreMes(mes)} {anio}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            const d = desplazarMes(anio, mes, 1);
            setAnio(d.anio);
            setMes(d.mes);
          }}
        >
          ›
        </Button>
      </div>
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {etiquetasDiasSemana().map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {celdas.map((c) => {
          const items = porDia.get(c.iso) ?? [];
          return (
            <div
              key={c.iso}
              className={cn(
                "min-h-[84px] border-b border-r p-1 [&:nth-child(7n)]:border-r-0",
                !c.enMes && "bg-muted/30 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-5 w-5 items-center justify-center rounded-full text-xs",
                  c.esHoy && "bg-champagne font-semibold text-white",
                )}
              >
                {Number(c.iso.slice(8, 10))}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {items.slice(0, 3).map((t) => (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => onAbrir(t.id)}
                    title={t.titulo}
                    className={cn(
                      "block w-full truncate rounded px-1 py-0.5 text-left text-[10px]",
                      t.estado === "completada"
                        ? "bg-estado-ganada/12 text-estado-ganada-fg"
                        : tareaVencida(t)
                          ? "bg-estado-perdida/12 text-estado-perdida-fg"
                          : "bg-accent",
                    )}
                  >
                    {t.titulo}
                  </button>
                ))}
                {items.length > 3 && (
                  <span className="block px-1 text-[10px] text-muted-foreground">
                    +{items.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

// ── Pestaña Equipo ──────────────────────────────────────────
function PestanaEquipo({
  tareas,
  miembros,
  onAbrirTarea,
}: {
  tareas: Tarea[];
  miembros: { userId: string; nombre: string; rol: string; correo: string }[];
  onAbrirTarea: (id: string) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);

  const stats = (uid: string) => {
    const mine = tareas.filter((t) => t.asignadoA === uid);
    const pend = mine.filter(
      (t) => t.estado !== "completada",
    ).length;
    const curso = mine.filter((t) => t.estado === "en_curso").length;
    const venc = mine.filter((t) => tareaVencida(t)).length;
    const sem = mine.filter((t) => completadaEstaSemana(t)).length;
    const total = mine.length;
    const hechas = mine.filter((t) => t.estado === "completada").length;
    const cumpl = total === 0 ? 0 : Math.round((hechas / total) * 100);
    return { pend, curso, venc, sem, cumpl, total };
  };

  const detalleMiembro = sel
    ? miembros.find((m) => m.userId === sel)
    : null;
  const tareasMiembro = sel
    ? tareas.filter((t) => t.asignadoA === sel)
    : [];

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {miembros.map((m) => {
          const s = stats(m.userId);
          return (
            <Card
              key={m.userId}
              className={cn(
                "cursor-pointer space-y-2 p-4 transition-colors hover:border-champagne",
                sel === m.userId && "border-champagne",
              )}
              onClick={() => setSel(sel === m.userId ? null : m.userId)}
            >
              <div className="flex items-center gap-2">
                <Avatar
                  nombre={m.nombre}
                  userId={m.userId}
                  className="h-9 w-9 text-sm"
                />
                <div className="min-w-0">
                  <p className="truncate font-medium">{m.nombre}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.rol === "admin" ? "Administrador" : "Miembro"}
                  </p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-1 text-xs">
                <span>Pendientes: <b>{s.pend}</b></span>
                <span>En curso: <b>{s.curso}</b></span>
                <span
                  className={cn(s.venc > 0 && "text-estado-perdida")}
                >
                  Vencidas: <b>{s.venc}</b>
                </span>
                <span>Hechas (7 d): <b>{s.sem}</b></span>
              </div>
              <div>
                <div className="mb-0.5 flex justify-between text-[11px] text-muted-foreground">
                  <span>Cumplimiento</span>
                  <span>{s.cumpl}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-champagne"
                    style={{ width: `${s.cumpl}%` }}
                  />
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {detalleMiembro && (
        <Card className="p-4">
          <h3 className="mb-2 text-sm font-semibold">
            Tareas de {detalleMiembro.nombre} ({tareasMiembro.length})
          </h3>
          {tareasMiembro.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              Sin tareas asignadas.
            </p>
          ) : (
            <ul className="divide-y">
              {tareasMiembro.map((t) => (
                <li key={t.id}>
                  <button
                    type="button"
                    onClick={() => onAbrirTarea(t.id)}
                    className="flex w-full items-center justify-between gap-2 py-2 text-left text-sm hover:text-primary"
                  >
                    <span className="truncate">{t.titulo}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {ETIQUETA_ESTADO_TAREA[t.estado]}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}
    </div>
  );
}

// ── Pestaña Actividad ───────────────────────────────────────
function PestanaActividad({
  actividad,
  tareas,
  miembros,
  empresasNombre,
  nombreDe,
  onAbrirTarea,
}: {
  actividad: ActividadTarea[];
  tareas: Tarea[];
  miembros: { userId: string; nombre: string }[];
  empresasNombre: Map<string, string>;
  nombreDe: (id: string | null | undefined) => string;
  onAbrirTarea: (id: string) => void;
}) {
  const [colab, setColab] = useState("todos");
  const [tipo, setTipo] = useState("todos");
  const [emp, setEmp] = useState("todas");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  const tituloTarea = useMemo(() => {
    const m = new Map<string, string>();
    for (const t of tareas) m.set(t.id, t.titulo);
    return m;
  }, [tareas]);
  const empresaDeTarea = useMemo(() => {
    const m = new Map<string, string | null>();
    for (const t of tareas) m.set(t.id, t.empresaId);
    return m;
  }, [tareas]);

  const filtrada = actividad.filter((a) => {
    if (colab !== "todos" && a.actorId !== colab) return false;
    if (tipo !== "todos" && a.accion !== tipo) return false;
    if (emp !== "todas") {
      const e = a.tareaId ? empresaDeTarea.get(a.tareaId) : null;
      if (e !== emp) return false;
    }
    const dia = a.fechaCreacion.slice(0, 10);
    if (desde && dia < desde) return false;
    if (hasta && dia > hasta) return false;
    return true;
  });

  const empresasConTareas = Array.from(
    new Set(
      tareas.map((t) => t.empresaId).filter((x): x is string => Boolean(x)),
    ),
  );

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center gap-2 p-3">
        <FiltroSelect
          valor={colab}
          onChange={setColab}
          aria="Colaborador"
          opciones={[
            ["todos", "Colaborador: todos"],
            ...miembros.map((m) => [m.userId, m.nombre] as [string, string]),
          ]}
        />
        <FiltroSelect
          valor={tipo}
          onChange={setTipo}
          aria="Tipo"
          opciones={[
            ["todos", "Tipo: todos"],
            ...TIPOS_ACTIVIDAD_TAREA.map(
              (t) => [t.valor, t.etiqueta] as [string, string],
            ),
          ]}
        />
        <FiltroSelect
          valor={emp}
          onChange={setEmp}
          aria="Empresa"
          opciones={[
            ["todas", "Empresa: todas"],
            ...empresasConTareas.map(
              (id) =>
                [id, empresasNombre.get(id) ?? "Empresa"] as [string, string],
            ),
          ]}
        />
        <label className="flex items-center gap-1 text-xs text-muted-foreground">
          <Input
            type="date"
            value={desde}
            onChange={(e) => setDesde(e.target.value)}
            className="h-9 w-[130px]"
            aria-label="Desde"
          />
          –
          <Input
            type="date"
            value={hasta}
            onChange={(e) => setHasta(e.target.value)}
            className="h-9 w-[130px]"
            aria-label="Hasta"
          />
        </label>
      </Card>

      <Card className="p-4">
        {filtrada.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Sin actividad para estos filtros.
          </p>
        ) : (
          <ol className="space-y-2.5">
            {filtrada.slice(0, 200).map((a) => (
              <li key={a.id} className="flex items-baseline gap-2 text-sm">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne" />
                <span className="min-w-0 flex-1">
                  {describirActividad(a, nombreDe)}
                  {a.tareaId && tituloTarea.get(a.tareaId) && (
                    <>
                      {" — "}
                      <button
                        type="button"
                        onClick={() => onAbrirTarea(a.tareaId as string)}
                        className="font-medium hover:underline"
                      >
                        {tituloTarea.get(a.tareaId)}
                      </button>
                    </>
                  )}
                  <span className="ml-1 text-[11px] text-muted-foreground">
                    · {formatearFechaHora(a.fechaCreacion)}
                  </span>
                </span>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  );
}
