"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CalendarClock,
  GripVertical,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
import { Field } from "@/components/empresas/field";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { formatearFecha } from "@/lib/date";
import {
  COLUMNAS_TAREA,
  ETIQUETA_PRIORIDAD,
  agruparPorEstado,
  resumirTareas,
  siguienteOrden,
  tareaVencida,
} from "@/lib/tareas";
import {
  PRIORIDADES_TAREA,
  type EstadoTarea,
  type PrioridadTarea,
  type Tarea,
  type TareaInput,
} from "@/lib/types";

const PRIORIDAD_CLASE: Record<PrioridadTarea, string> = {
  alta: "bg-estado-perdida/12 text-estado-perdida-fg",
  media: "bg-estado-platicas-suave text-estado-platicas-fg",
  baja: "bg-muted text-muted-foreground",
};

const TAREA_VACIA: TareaInput = {
  empresaId: null,
  contactoId: null,
  titulo: "",
  descripcion: "",
  estado: "por_hacer",
  prioridad: "media",
  asignadoA: null,
  venceEn: null,
  fechaLimite: null,
  progreso: 0,
  orden: 0,
  responsable: "",
};

export function TareasView() {
  const { empresas } = useEmpresas();
  const {
    tareas,
    cargando,
    procesando,
    crearTarea,
    actualizarTarea,
    moverTarea,
    eliminarTarea,
  } = useFase2();

  const [formAbierto, setFormAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Tarea | null>(null);
  const [estadoNueva, setEstadoNueva] = useState<EstadoTarea>("por_hacer");
  const [aEliminar, setAEliminar] = useState<Tarea | null>(null);
  const [arrastrando, setArrastrando] = useState<string | null>(null);
  const [columnaActiva, setColumnaActiva] = useState<EstadoTarea | null>(null);

  const grupos = useMemo(() => agruparPorEstado(tareas), [tareas]);
  const resumen = useMemo(() => resumirTareas(tareas), [tareas]);

  const nombreEmpresa = useMemo(() => {
    const mapa = new Map<string, string>();
    for (const e of empresas) mapa.set(e.id, e.nombre);
    return mapa;
  }, [empresas]);

  function abrirNueva(estado: EstadoTarea) {
    setEnEdicion(null);
    setEstadoNueva(estado);
    setFormAbierto(true);
  }

  function soltarEn(estado: EstadoTarea) {
    const id = arrastrando;
    setArrastrando(null);
    setColumnaActiva(null);
    if (!id) return;
    const tarea = tareas.find((t) => t.id === id);
    if (!tarea || tarea.estado === estado) return;
    void moverTarea(id, estado, siguienteOrden(tareas, estado));
  }

  const indicadores = [
    { etiqueta: "Total", valor: resumen.total, icono: ListChecks },
    { etiqueta: "En curso", valor: resumen.enCurso, icono: ListChecks },
    { etiqueta: "Completadas", valor: resumen.completadas, icono: ListChecks },
    {
      etiqueta: "Vencidas",
      valor: resumen.vencidas,
      icono: CalendarClock,
      alerta: true,
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Tareas"
        subtitle="Tablero para organizar el trabajo por estado."
        action={
          <Button
            className="w-full sm:w-auto"
            onClick={() => abrirNueva("por_hacer")}
          >
            <Plus className="h-4 w-4 text-champagne" />
            Nueva tarea
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map((ind) => (
          <Card key={ind.etiqueta} className="flex items-center gap-3 p-4">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                ind.alerta ? "bg-estado-perdida/12" : "bg-accent",
              )}
            >
              <ind.icono
                className={cn(
                  "h-5 w-5",
                  ind.alerta ? "text-estado-perdida" : "text-champagne",
                )}
              />
            </span>
            <div className="min-w-0">
              {cargando ? (
                <Skeleton className="h-7 w-10" />
              ) : (
                <p className="text-2xl font-semibold leading-tight tracking-tight">
                  {ind.valor}
                </p>
              )}
              <p className="truncate text-xs text-muted-foreground">
                {ind.etiqueta}
              </p>
            </div>
          </Card>
        ))}
      </div>

      {cargando ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNAS_TAREA.map((c) => (
            <Skeleton key={c.estado} className="h-64 w-full" />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {COLUMNAS_TAREA.map((col) => {
            const items = grupos[col.estado];
            return (
              <section
                key={col.estado}
                onDragOver={(e) => {
                  e.preventDefault();
                  setColumnaActiva(col.estado);
                }}
                onDragLeave={() => setColumnaActiva((c) => (c === col.estado ? null : c))}
                onDrop={() => soltarEn(col.estado)}
                className={cn(
                  "flex flex-col rounded-lg border bg-muted/40 transition-colors",
                  columnaActiva === col.estado && "border-champagne bg-accent/50",
                )}
              >
                <header className="flex items-center justify-between gap-2 border-b px-3 py-2">
                  <span className="text-sm font-semibold">{col.etiqueta}</span>
                  <span className="rounded-full bg-background px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground">
                    {items.length}
                  </span>
                </header>

                <div className="flex flex-1 flex-col gap-2 p-2">
                  {items.length === 0 && (
                    <p className="px-1 py-6 text-center text-xs text-muted-foreground">
                      Sin tareas
                    </p>
                  )}
                  {items.map((tarea) => (
                    <TarjetaTarea
                      key={tarea.id}
                      tarea={tarea}
                      empresa={
                        tarea.empresaId
                          ? (nombreEmpresa.get(tarea.empresaId) ?? null)
                          : null
                      }
                      vencida={tareaVencida(tarea)}
                      onDragStart={() => setArrastrando(tarea.id)}
                      onDragEnd={() => {
                        setArrastrando(null);
                        setColumnaActiva(null);
                      }}
                      onEditar={() => {
                        setEnEdicion(tarea);
                        setFormAbierto(true);
                      }}
                      onEliminar={() => setAEliminar(tarea)}
                      onMover={(estado) =>
                        void moverTarea(
                          tarea.id,
                          estado,
                          siguienteOrden(tareas, estado),
                        )
                      }
                    />
                  ))}

                  <button
                    type="button"
                    onClick={() => abrirNueva(col.estado)}
                    className="mt-1 flex items-center justify-center gap-1 rounded-md border border-dashed py-1.5 text-xs text-muted-foreground transition-colors hover:border-champagne hover:text-foreground"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    Agregar
                  </button>
                </div>
              </section>
            );
          })}
        </div>
      )}

      <TareaFormDialog
        abierto={formAbierto}
        tarea={enEdicion}
        estadoInicial={estadoNueva}
        empresas={empresas.map((e) => ({ id: e.id, nombre: e.nombre }))}
        procesando={procesando}
        onOpenChange={(v) => {
          setFormAbierto(v);
          if (!v) setEnEdicion(null);
        }}
        onGuardar={async (datos) => {
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
        }}
      />

      <Dialog
        open={aEliminar !== null}
        onOpenChange={(v) => !v && setAEliminar(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar tarea</DialogTitle>
            <DialogDescription>
              Se eliminará “{aEliminar?.titulo}”. Esta acción no se puede
              deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAEliminar(null)}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={procesando}
              onClick={async () => {
                if (!aEliminar) return;
                await eliminarTarea(aEliminar.id);
                setAEliminar(null);
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

function TarjetaTarea({
  tarea,
  empresa,
  vencida,
  onDragStart,
  onDragEnd,
  onEditar,
  onEliminar,
  onMover,
}: {
  tarea: Tarea;
  empresa: string | null;
  vencida: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onEditar: () => void;
  onEliminar: () => void;
  onMover: (estado: EstadoTarea) => void;
}) {
  return (
    <article
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      className="group rounded-md border bg-card p-2.5 shadow-card"
    >
      <div className="flex items-start gap-1.5">
        <GripVertical className="mt-0.5 h-4 w-4 shrink-0 cursor-grab text-muted-foreground/50" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-snug">{tarea.titulo}</p>
          {empresa && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {empresa}
            </p>
          )}
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span
              className={cn(
                "rounded-full px-1.5 py-0.5 text-[10px] font-medium",
                PRIORIDAD_CLASE[tarea.prioridad],
              )}
            >
              {ETIQUETA_PRIORIDAD[tarea.prioridad]}
            </span>
            {tarea.fechaLimite && (
              <span
                className={cn(
                  "inline-flex items-center gap-1 text-[10px]",
                  vencida
                    ? "font-medium text-estado-perdida"
                    : "text-muted-foreground",
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {formatearFecha(tarea.fechaLimite)}
              </span>
            )}
            {tarea.responsable && (
              <span className="truncate text-[10px] text-muted-foreground">
                · {tarea.responsable}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <Select value={tarea.estado} onValueChange={(v) => onMover(v as EstadoTarea)}>
          <SelectTrigger
            className="h-7 w-[125px] text-xs"
            aria-label="Mover tarea a otra columna"
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
        <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            aria-label="Editar tarea"
            onClick={onEditar}
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7 text-destructive hover:text-destructive"
            aria-label="Eliminar tarea"
            onClick={onEliminar}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>
    </article>
  );
}

function TareaFormDialog({
  abierto,
  tarea,
  estadoInicial,
  empresas,
  procesando,
  onOpenChange,
  onGuardar,
}: {
  abierto: boolean;
  tarea: Tarea | null;
  estadoInicial: EstadoTarea;
  empresas: { id: string; nombre: string }[];
  procesando: boolean;
  onOpenChange: (abierto: boolean) => void;
  onGuardar: (datos: TareaInput) => Promise<void>;
}) {
  const editando = tarea !== null;
  const [datos, setDatos] = useState<TareaInput>(TAREA_VACIA);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!abierto) return;
    setError(undefined);
    if (tarea) {
      setDatos({
        empresaId: tarea.empresaId,
        contactoId: tarea.contactoId,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        estado: tarea.estado,
        prioridad: tarea.prioridad,
        asignadoA: tarea.asignadoA,
        venceEn: tarea.venceEn,
        fechaLimite: tarea.fechaLimite,
        progreso: tarea.progreso,
        orden: tarea.orden,
        responsable: tarea.responsable,
      });
    } else {
      setDatos({ ...TAREA_VACIA, estado: estadoInicial });
    }
  }, [abierto, tarea, estadoInicial]);

  function set<K extends keyof TareaInput>(clave: K, valor: TareaInput[K]) {
    setDatos((prev) => ({ ...prev, [clave]: valor }));
  }

  async function enviar() {
    if (!datos.titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    await onGuardar({ ...datos, titulo: datos.titulo.trim() });
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogDescription>
            {editando
              ? "Actualiza los datos de la tarea."
              : "Crea una tarea y colócala en el tablero."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field id="t-titulo" label="Título" requerido error={error}>
            <Input
              id="t-titulo"
              value={datos.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              autoComplete="off"
            />
          </Field>

          <Field id="t-desc" label="Descripción">
            <Textarea
              id="t-desc"
              rows={3}
              value={datos.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="t-estado" label="Columna">
              <Select
                value={datos.estado}
                onValueChange={(v) => set("estado", v as EstadoTarea)}
              >
                <SelectTrigger id="t-estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNAS_TAREA.map((c) => (
                    <SelectItem key={c.estado} value={c.estado}>
                      {c.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field id="t-prioridad" label="Prioridad">
              <Select
                value={datos.prioridad}
                onValueChange={(v) => set("prioridad", v as PrioridadTarea)}
              >
                <SelectTrigger id="t-prioridad">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES_TAREA.map((p) => (
                    <SelectItem key={p} value={p}>
                      {ETIQUETA_PRIORIDAD[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="t-fecha" label="Fecha límite">
              <Input
                id="t-fecha"
                type="date"
                value={datos.fechaLimite ?? ""}
                onChange={(e) => set("fechaLimite", e.target.value || null)}
              />
            </Field>
            <Field id="t-resp" label="Responsable">
              <Input
                id="t-resp"
                value={datos.responsable}
                onChange={(e) => set("responsable", e.target.value)}
                autoComplete="off"
              />
            </Field>
          </div>

          <Field id="t-empresa" label="Empresa relacionada">
            <Select
              value={datos.empresaId ?? "ninguna"}
              onValueChange={(v) => set("empresaId", v === "ninguna" ? null : v)}
            >
              <SelectTrigger id="t-empresa">
                <SelectValue placeholder="Ninguna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna">Ninguna</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={procesando}
          >
            Cancelar
          </Button>
          <Button onClick={enviar} disabled={procesando}>
            {editando ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
