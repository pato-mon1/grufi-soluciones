"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Pencil,
  RotateCcw,
  Send,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, SelectorUsuario } from "@/components/tareas/selector-usuario";
import { describirActividad } from "@/lib/actividad-tarea";
import { COLUMNAS_TAREA, ETIQUETA_PRIORIDAD } from "@/lib/tareas";
import { formatearFechaHora } from "@/lib/date";
import {
  ETIQUETA_ESTADO_TAREA,
  type ActividadTarea,
  type ComentarioTarea,
  type EstadoTarea,
  type MiembroEquipo,
  type PrioridadTarea,
  type Subtarea,
  type Tarea,
  type TareaInput,
} from "@/lib/types";

const PRIORIDAD_CLASE: Record<PrioridadTarea, string> = {
  alta: "bg-estado-perdida/12 text-estado-perdida-fg",
  media: "bg-estado-platicas-suave text-estado-platicas-fg",
  baja: "bg-muted text-muted-foreground",
};

interface Props {
  tarea: Tarea;
  abierta: boolean;
  onOpenChange: (v: boolean) => void;
  miembros: MiembroEquipo[];
  empresaNombre: string | null;
  miUserId: string | null;
  soyAdmin: boolean;
  subtareas: Subtarea[];
  comentarios: ComentarioTarea[];
  actividad: ActividadTarea[];
  procesando: boolean;
  onActualizar: (cambios: Partial<TareaInput>) => Promise<void>;
  onEditar: () => void;
  onEliminar: () => void;
  onCrearSubtarea: (titulo: string) => Promise<void>;
  onAlternarSubtarea: (id: string, completada: boolean) => Promise<void>;
  onEliminarSubtarea: (id: string) => Promise<void>;
  onCrearComentario: (contenido: string, mencionados: string[]) => Promise<void>;
  onEliminarComentario: (id: string) => Promise<void>;
}

export function PanelDetalleTarea({
  tarea,
  abierta,
  onOpenChange,
  miembros,
  empresaNombre,
  miUserId,
  soyAdmin,
  subtareas,
  comentarios,
  actividad,
  procesando,
  onActualizar,
  onEditar,
  onEliminar,
  onCrearSubtarea,
  onAlternarSubtarea,
  onEliminarSubtarea,
  onCrearComentario,
  onEliminarComentario,
}: Props) {
  const nombre = useMemo(() => {
    const m = new Map<string, string>();
    for (const x of miembros) m.set(x.userId, x.nombre);
    return (id: string | null | undefined) =>
      (id && (m.get(id) || (id === "local" ? "Yo" : null))) || "Alguien";
  }, [miembros]);

  const soyResponsable = tarea.asignadoA === miUserId;
  const soyCreador =
    tarea.creadoPor === miUserId || (tarea.creadoPor == null && !!miUserId);
  const puedeEditarTodo = soyCreador || soyAdmin;
  const puedeAvanzar = soyResponsable || puedeEditarTodo;
  const completada = tarea.estado === "completada";

  const subs = subtareas
    .filter((s) => s.tareaId === tarea.id)
    .sort((a, b) => a.orden - b.orden);
  const coms = comentarios
    .filter((c) => c.tareaId === tarea.id)
    .sort((a, b) => a.fechaCreacion.localeCompare(b.fechaCreacion));
  const hist = actividad
    .filter((a) => a.tareaId === tarea.id)
    .sort((a, b) => b.fechaCreacion.localeCompare(a.fechaCreacion));

  const [nuevaSub, setNuevaSub] = useState("");
  const [comentario, setComentario] = useState("");

  function detectarMenciones(texto: string): string[] {
    const ids: string[] = [];
    for (const m of miembros) {
      const primer = m.nombre.trim().split(/\s+/)[0]?.toLowerCase();
      if (primer && texto.toLowerCase().includes(`@${primer}`)) {
        ids.push(m.userId);
      }
    }
    return ids;
  }

  async function enviarComentario() {
    const t = comentario.trim();
    if (!t) return;
    await onCrearComentario(t, detectarMenciones(t));
    setComentario("");
  }

  return (
    <Sheet open={abierta} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b p-4 text-left">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-xs font-medium",
                PRIORIDAD_CLASE[tarea.prioridad],
              )}
            >
              {ETIQUETA_PRIORIDAD[tarea.prioridad]}
            </span>
            <span className="rounded-full bg-accent px-2 py-0.5 text-xs font-medium">
              {ETIQUETA_ESTADO_TAREA[tarea.estado]}
            </span>
          </div>
          <SheetTitle className="text-base leading-snug">
            {tarea.titulo}
          </SheetTitle>
          <SheetDescription>
            {empresaNombre ? (
              <>Empresa: {empresaNombre}</>
            ) : (
              "Sin empresa relacionada"
            )}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 p-4">
          {/* Acciones principales */}
          <div className="flex flex-wrap gap-2">
            {!completada ? (
              <Button
                size="sm"
                disabled={!puedeAvanzar || procesando}
                onClick={() => void onActualizar({ estado: "completada" })}
              >
                <CheckCircle2 className="h-4 w-4" />
                Marcar como completada
              </Button>
            ) : (
              <Button
                size="sm"
                variant="outline"
                disabled={!puedeAvanzar || procesando}
                onClick={() => void onActualizar({ estado: "por_hacer" })}
              >
                <RotateCcw className="h-4 w-4" />
                Reabrir tarea
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={!puedeEditarTodo}
              onClick={onEditar}
            >
              <Pencil className="h-4 w-4" />
              Editar
            </Button>
            {puedeEditarTodo && (
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive hover:text-destructive"
                onClick={onEliminar}
              >
                <Trash2 className="h-4 w-4" />
                Eliminar
              </Button>
            )}
          </div>

          {tarea.descripcion && (
            <p className="whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-sm">
              {tarea.descripcion}
            </p>
          )}

          {/* Meta */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Responsable</p>
              {puedeEditarTodo ? (
                <SelectorUsuario
                  valor={tarea.asignadoA}
                  miembros={miembros}
                  onChange={(u) => void onActualizar({ asignadoA: u })}
                />
              ) : (
                <span className="flex items-center gap-1.5">
                  {tarea.asignadoA && (
                    <Avatar
                      nombre={nombre(tarea.asignadoA)}
                      userId={tarea.asignadoA}
                    />
                  )}
                  {tarea.asignadoA ? nombre(tarea.asignadoA) : "Sin asignar"}
                </span>
              )}
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Creada por</p>
              <span className="flex items-center gap-1.5">
                {tarea.creadoPor && (
                  <Avatar
                    nombre={nombre(tarea.creadoPor)}
                    userId={tarea.creadoPor}
                  />
                )}
                {nombre(tarea.creadoPor)}
              </span>
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Estado</p>
              <Select
                value={tarea.estado}
                onValueChange={(v) =>
                  void onActualizar({ estado: v as EstadoTarea })
                }
                disabled={!puedeAvanzar || procesando}
              >
                <SelectTrigger className="h-8 text-xs">
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
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Fecha límite</p>
              <Input
                type="date"
                className="h-8 text-xs"
                value={tarea.fechaLimite ?? ""}
                max="2035-12-31"
                disabled={!puedeEditarTodo}
                onChange={(e) => {
                  const f = e.target.value || null;
                  void onActualizar({
                    fechaLimite: f,
                    venceEn: f ? `${f}T18:00:00` : null,
                  });
                }}
              />
            </div>
          </div>

          {/* Avance */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Avance</span>
              <span className="tabular-nums">{tarea.progreso}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={tarea.progreso}
              disabled={!puedeAvanzar}
              onChange={(e) =>
                void onActualizar({ progreso: Number(e.target.value) })
              }
              className="w-full accent-champagne"
              aria-label="Porcentaje de avance"
            />
          </div>

          <Separator />

          {/* Subtareas */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">
              Subtareas ({subs.filter((s) => s.completada).length}/{subs.length})
            </h3>
            <ul className="space-y-1">
              {subs.map((s) => (
                <li key={s.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="h-4 w-4 rounded border-input accent-champagne"
                    checked={s.completada}
                    onChange={(e) =>
                      void onAlternarSubtarea(s.id, e.target.checked)
                    }
                    aria-label={s.titulo}
                  />
                  <span
                    className={cn(
                      "min-w-0 flex-1 truncate",
                      s.completada && "text-muted-foreground line-through",
                    )}
                  >
                    {s.titulo}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 text-destructive hover:text-destructive"
                    aria-label="Quitar subtarea"
                    onClick={() => void onEliminarSubtarea(s.id)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
            <form
              className="flex gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (nuevaSub.trim()) {
                  void onCrearSubtarea(nuevaSub.trim());
                  setNuevaSub("");
                }
              }}
            >
              <Input
                value={nuevaSub}
                onChange={(e) => setNuevaSub(e.target.value)}
                placeholder="Nueva subtarea"
                className="h-8"
              />
              <Button type="submit" size="sm" disabled={!nuevaSub.trim()}>
                Agregar
              </Button>
            </form>
          </div>

          <Separator />

          {/* Comentarios */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Comentarios ({coms.length})</h3>
            <ul className="space-y-2">
              {coms.map((c) => {
                const mio = c.autorId === miUserId;
                return (
                  <li key={c.id} className="rounded-md border p-2 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5 text-xs font-medium">
                        <Avatar nombre={nombre(c.autorId)} userId={c.autorId} />
                        {nombre(c.autorId)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        {formatearFechaHora(c.fechaCreacion)}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap">{c.contenido}</p>
                    {(mio || soyAdmin) && (
                      <button
                        type="button"
                        onClick={() => void onEliminarComentario(c.id)}
                        className="mt-1 text-[11px] text-destructive hover:underline"
                      >
                        Eliminar
                      </button>
                    )}
                  </li>
                );
              })}
              {coms.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  Sin comentarios todavía.
                </li>
              )}
            </ul>
            <div className="flex items-end gap-2">
              <Textarea
                value={comentario}
                onChange={(e) => setComentario(e.target.value)}
                rows={2}
                placeholder="Escribe un avance o comentario. Usa @nombre para mencionar."
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="Enviar comentario"
                disabled={!comentario.trim()}
                onClick={() => void enviarComentario()}
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <Separator />

          {/* Historial */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold">Historial</h3>
            <ol className="space-y-2 text-sm">
              {hist.map((a) => (
                <li key={a.id} className="flex items-baseline gap-2">
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-champagne" />
                  <span className="min-w-0 flex-1">
                    {describirActividad(a, nombre)}
                    <span className="ml-1 text-[11px] text-muted-foreground">
                      · {formatearFechaHora(a.fechaCreacion)}
                    </span>
                  </span>
                </li>
              ))}
              {hist.length === 0 && (
                <li className="text-xs text-muted-foreground">
                  Sin movimientos registrados.
                </li>
              )}
            </ol>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
