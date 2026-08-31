"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/app-shell/page-header";
import { Field } from "@/components/empresas/field";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { formatearFechaLarga, hoyISO } from "@/lib/date";
import {
  construirItems,
  desdeIso,
  desplazarDia,
  desplazarMes,
  diasDeSemana,
  diasDelMes,
  etiquetasDiasSemana,
  isoLocal,
  itemsPorDia,
  nombreMes,
  type ItemCalendario,
  type TipoItemCalendario,
  type VistaCalendario,
} from "@/lib/calendario";
import {
  TIPOS_EVENTO,
  type EventoCalendario,
  type EventoInput,
  type TipoEvento,
} from "@/lib/types";

const CONFIG_ITEM: Record<
  TipoItemCalendario,
  { etiqueta: string; chip: string; dot: string }
> = {
  seguimiento: {
    etiqueta: "Seguimiento",
    chip: "bg-champagne/15 text-foreground",
    dot: "bg-champagne",
  },
  tarea: {
    etiqueta: "Tarea",
    chip: "bg-estado-avance-suave text-estado-avance-fg",
    dot: "bg-estado-avance",
  },
  cobro: {
    etiqueta: "Cobro",
    chip: "bg-estado-ganada/12 text-estado-ganada-fg",
    dot: "bg-estado-ganada",
  },
  pago: {
    etiqueta: "Pago",
    chip: "bg-estado-perdida/12 text-estado-perdida-fg",
    dot: "bg-estado-perdida",
  },
  evento: {
    etiqueta: "Evento",
    chip: "bg-estado-platicas-suave text-estado-platicas-fg",
    dot: "bg-estado-platicas",
  },
};

const ETIQUETA_TIPO_EVENTO: Record<TipoEvento, string> = {
  evento: "Evento",
  reunion: "Reunión",
  recordatorio: "Recordatorio",
  llamada: "Llamada",
};

export function CalendarioView() {
  const router = useRouter();
  const { empresas } = useEmpresas();
  const {
    eventos,
    tareas,
    movimientos,
    cargando,
    procesando,
    crearEvento,
    actualizarEvento,
    eliminarEvento,
  } = useFase2();

  const hoy = hoyISO();
  const [vista, setVista] = useState<VistaCalendario>("mes");
  const [ancla, setAncla] = useState(hoy); // fecha de referencia
  const [diaAbierto, setDiaAbierto] = useState<string | null>(null);
  const [formAbierto, setFormAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<EventoCalendario | null>(null);
  const [aEliminar, setAEliminar] = useState<EventoCalendario | null>(null);
  const [fechaNuevo, setFechaNuevo] = useState(hoy);

  const anclaDate = desdeIso(ancla);
  const anio = anclaDate.getFullYear();
  const mes = anclaDate.getMonth();

  const items = useMemo(
    () => construirItems({ empresas, tareas, movimientos, eventos }),
    [empresas, tareas, movimientos, eventos],
  );
  const porDia = useMemo(() => itemsPorDia(items), [items]);

  const eventoPorOrigen = useMemo(() => {
    const m = new Map<string, EventoCalendario>();
    for (const e of eventos) m.set(e.id, e);
    return m;
  }, [eventos]);

  function tituloPeriodo(): string {
    if (vista === "mes") {
      return `${capitalizar(nombreMes(mes))} ${anio}`;
    }
    if (vista === "semana") {
      const dias = diasDeSemana(ancla, hoy);
      return `${formatearFechaLarga(dias[0].iso)} – ${formatearFechaLarga(dias[6].iso)}`;
    }
    return capitalizar(formatearFechaLarga(ancla));
  }

  function navegar(delta: number) {
    if (vista === "mes") {
      const { anio: a, mes: m } = desplazarMes(anio, mes, delta);
      setAncla(isoLocal(new Date(a, m, 1)));
    } else if (vista === "semana") {
      setAncla(desplazarDia(ancla, delta * 7));
    } else {
      setAncla(desplazarDia(ancla, delta));
    }
  }

  function abrirDia(iso: string) {
    setDiaAbierto(iso);
  }

  function alHacerClicItem(item: ItemCalendario) {
    if (item.tipo === "evento") {
      const ev = eventoPorOrigen.get(item.origenId);
      if (ev) {
        setEnEdicion(ev);
        setFormAbierto(true);
        setDiaAbierto(null);
      }
      return;
    }
    if (item.enlace) router.push(item.enlace);
  }

  function nuevoEvento(fecha?: string) {
    setEnEdicion(null);
    setFormAbierto(true);
    setFechaNuevo(fecha ?? ancla);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-5 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Calendario"
        subtitle="Seguimientos, tareas, cobros y eventos en un solo lugar."
        action={
          <Button className="w-full sm:w-auto" onClick={() => nuevoEvento()}>
            <Plus className="h-4 w-4 text-champagne" />
            Nuevo evento
          </Button>
        }
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navegar(-1)} aria-label="Anterior">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" onClick={() => setAncla(hoy)}>
            Hoy
          </Button>
          <Button variant="outline" size="icon" onClick={() => navegar(1)} aria-label="Siguiente">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <span className="ml-1 text-sm font-medium">{tituloPeriodo()}</span>
        </div>

        <div className="flex gap-1 rounded-md border p-0.5">
          {(["mes", "semana", "dia"] as VistaCalendario[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVista(v)}
              className={cn(
                "rounded px-3 py-1 text-sm capitalize transition-colors",
                vista === v
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "dia" ? "Día" : v}
            </button>
          ))}
        </div>
      </div>

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        {(Object.keys(CONFIG_ITEM) as TipoItemCalendario[]).map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", CONFIG_ITEM[t].dot)} />
            {CONFIG_ITEM[t].etiqueta}
          </span>
        ))}
      </div>

      {cargando ? (
        <Skeleton className="h-[540px] w-full" />
      ) : vista === "mes" ? (
        <VistaMes
          anio={anio}
          mes={mes}
          hoy={hoy}
          porDia={porDia}
          onDia={abrirDia}
          onItem={alHacerClicItem}
        />
      ) : vista === "semana" ? (
        <VistaSemana
          ancla={ancla}
          hoy={hoy}
          porDia={porDia}
          onDia={abrirDia}
          onItem={alHacerClicItem}
          onNuevo={nuevoEvento}
        />
      ) : (
        <VistaDia
          fecha={ancla}
          items={porDia[ancla] ?? []}
          onItem={alHacerClicItem}
          onNuevo={() => nuevoEvento(ancla)}
        />
      )}

      {/* Panel de un día (desde vista mes/semana) */}
      <Sheet
        open={diaAbierto !== null}
        onOpenChange={(v) => !v && setDiaAbierto(null)}
      >
        <SheetContent side="right" className="w-full max-w-sm overflow-y-auto">
          <SheetHeader>
            <SheetTitle className="capitalize">
              {diaAbierto ? formatearFechaLarga(diaAbierto) : ""}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-2">
            {(diaAbierto ? (porDia[diaAbierto] ?? []) : []).length === 0 && (
              <p className="text-sm text-muted-foreground">Sin actividad.</p>
            )}
            {(diaAbierto ? (porDia[diaAbierto] ?? []) : []).map((item) => (
              <ItemFila key={item.id} item={item} onClick={() => alHacerClicItem(item)} />
            ))}
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                if (diaAbierto) nuevoEvento(diaAbierto);
                setDiaAbierto(null);
              }}
            >
              <Plus className="h-4 w-4" />
              Nuevo evento este día
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      <EventoFormDialog
        abierto={formAbierto}
        evento={enEdicion}
        fechaInicial={fechaNuevo}
        empresas={empresas.map((e) => ({ id: e.id, nombre: e.nombre }))}
        procesando={procesando}
        onOpenChange={(v) => {
          setFormAbierto(v);
          if (!v) setEnEdicion(null);
        }}
        onGuardar={async (datos) => {
          if (enEdicion) await actualizarEvento(enEdicion.id, datos);
          else await crearEvento(datos);
          setFormAbierto(false);
          setEnEdicion(null);
        }}
        onEliminar={enEdicion ? () => setAEliminar(enEdicion) : undefined}
      />

      <Dialog
        open={aEliminar !== null}
        onOpenChange={(v) => !v && setAEliminar(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar evento</DialogTitle>
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
                await eliminarEvento(aEliminar.id);
                setAEliminar(null);
                setFormAbierto(false);
                setEnEdicion(null);
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

function capitalizar(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function ItemChip({
  item,
  onClick,
}: {
  item: ItemCalendario;
  onClick: () => void;
}) {
  const cfg = CONFIG_ITEM[item.tipo];
  return (
    <button
      type="button"
      onClick={onClick}
      title={item.titulo}
      className={cn(
        "flex w-full items-center gap-1 truncate rounded px-1 py-0.5 text-left text-[11px] leading-tight",
        cfg.chip,
      )}
    >
      <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", cfg.dot)} />
      {item.hora && <span className="tabular-nums">{item.hora}</span>}
      <span className="truncate">{item.titulo}</span>
    </button>
  );
}

function ItemFila({
  item,
  onClick,
}: {
  item: ItemCalendario;
  onClick: () => void;
}) {
  const cfg = CONFIG_ITEM[item.tipo];
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-start gap-2 rounded-md border bg-card p-2 text-left text-sm shadow-card hover:bg-accent/40"
    >
      <span className={cn("mt-1 h-2.5 w-2.5 shrink-0 rounded-full", cfg.dot)} />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate font-medium">{item.titulo}</span>
          {item.hora && (
            <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
              {item.hora}
            </span>
          )}
        </span>
        <span className="text-xs text-muted-foreground">
          {cfg.etiqueta}
          {item.empresaNombre ? ` · ${item.empresaNombre}` : ""}
        </span>
      </span>
    </button>
  );
}

function VistaMes({
  anio,
  mes,
  hoy,
  porDia,
  onDia,
  onItem,
}: {
  anio: number;
  mes: number;
  hoy: string;
  porDia: Record<string, ItemCalendario[]>;
  onDia: (iso: string) => void;
  onItem: (item: ItemCalendario) => void;
}) {
  const celdas = diasDelMes(anio, mes, hoy);
  return (
    <Card className="overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-muted/40 text-center text-xs font-medium text-muted-foreground">
        {etiquetasDiasSemana().map((d) => (
          <div key={d} className="py-2">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {celdas.map((celda) => {
          const delDia = porDia[celda.iso] ?? [];
          return (
            <button
              type="button"
              key={celda.iso}
              onClick={() => onDia(celda.iso)}
              className={cn(
                "min-h-[92px] border-b border-r p-1 text-left align-top transition-colors last:border-r-0 hover:bg-accent/30 [&:nth-child(7n)]:border-r-0",
                !celda.enMes && "bg-muted/30 text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                  celda.esHoy && "bg-champagne font-semibold text-white",
                )}
              >
                {Number(celda.iso.slice(8, 10))}
              </span>
              <div className="mt-0.5 space-y-0.5">
                {delDia.slice(0, 3).map((item) => (
                  <ItemChip
                    key={item.id}
                    item={item}
                    onClick={() => onItem(item)}
                  />
                ))}
                {delDia.length > 3 && (
                  <span className="block px-1 text-[10px] text-muted-foreground">
                    +{delDia.length - 3} más
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

function VistaSemana({
  ancla,
  hoy,
  porDia,
  onDia,
  onItem,
  onNuevo,
}: {
  ancla: string;
  hoy: string;
  porDia: Record<string, ItemCalendario[]>;
  onDia: (iso: string) => void;
  onItem: (item: ItemCalendario) => void;
  onNuevo: (fecha: string) => void;
}) {
  const dias = diasDeSemana(ancla, hoy);
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
      {dias.map((dia) => {
        const delDia = porDia[dia.iso] ?? [];
        return (
          <Card key={dia.iso} className="flex flex-col p-0">
            <button
              type="button"
              onClick={() => onDia(dia.iso)}
              className={cn(
                "flex items-center justify-between border-b px-3 py-2 text-sm hover:bg-accent/30",
                dia.esHoy && "bg-accent/50",
              )}
            >
              <span className="font-medium capitalize">
                {capitalizar(formatearFechaLarga(dia.iso).replace(/ de \d{4}$/, ""))}
              </span>
              <span className="text-xs text-muted-foreground">
                {delDia.length}
              </span>
            </button>
            <div className="flex-1 space-y-1 p-2">
              {delDia.length === 0 && (
                <p className="px-1 py-3 text-center text-xs text-muted-foreground">
                  —
                </p>
              )}
              {delDia.map((item) => (
                <ItemChip key={item.id} item={item} onClick={() => onItem(item)} />
              ))}
              <button
                type="button"
                onClick={() => onNuevo(dia.iso)}
                className="w-full rounded border border-dashed py-1 text-[11px] text-muted-foreground hover:border-champagne hover:text-foreground"
              >
                + Evento
              </button>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function VistaDia({
  fecha,
  items,
  onItem,
  onNuevo,
}: {
  fecha: string;
  items: ItemCalendario[];
  onItem: (item: ItemCalendario) => void;
  onNuevo: () => void;
}) {
  return (
    <Card className="space-y-2 p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold capitalize">
          {formatearFechaLarga(fecha)}
        </h3>
        <Button variant="outline" size="sm" onClick={onNuevo}>
          <Plus className="h-4 w-4" />
          Evento
        </Button>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Nada programado para este día.
        </p>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <ItemFila key={item.id} item={item} onClick={() => onItem(item)} />
          ))}
        </div>
      )}
    </Card>
  );
}

function EventoFormDialog({
  abierto,
  evento,
  fechaInicial,
  empresas,
  procesando,
  onOpenChange,
  onGuardar,
  onEliminar,
}: {
  abierto: boolean;
  evento: EventoCalendario | null;
  fechaInicial: string;
  empresas: { id: string; nombre: string }[];
  procesando: boolean;
  onOpenChange: (abierto: boolean) => void;
  onGuardar: (datos: EventoInput) => Promise<void>;
  onEliminar?: () => void;
}) {
  const editando = evento !== null;
  const [titulo, setTitulo] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [empresaId, setEmpresaId] = useState<string | null>(null);
  const [tipo, setTipo] = useState<TipoEvento>("evento");
  const [fecha, setFecha] = useState(fechaInicial);
  const [todoElDia, setTodoElDia] = useState(false);
  const [horaInicio, setHoraInicio] = useState("09:00");
  const [horaFin, setHoraFin] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!abierto) return;
    setError(undefined);
    if (evento) {
      setTitulo(evento.titulo);
      setDescripcion(evento.descripcion);
      setEmpresaId(evento.empresaId);
      setTipo(evento.tipo);
      setFecha(evento.inicio.slice(0, 10));
      setTodoElDia(evento.todoElDia);
      setHoraInicio(evento.todoElDia ? "09:00" : evento.inicio.slice(11, 16));
      setHoraFin(evento.fin ? evento.fin.slice(11, 16) : "");
    } else {
      setTitulo("");
      setDescripcion("");
      setEmpresaId(null);
      setTipo("evento");
      setFecha(fechaInicial);
      setTodoElDia(false);
      setHoraInicio("09:00");
      setHoraFin("");
    }
  }, [abierto, evento, fechaInicial]);

  async function enviar() {
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    const inicio = todoElDia
      ? `${fecha}T00:00:00`
      : `${fecha}T${horaInicio || "09:00"}:00`;
    const fin = todoElDia
      ? null
      : horaFin
        ? `${fecha}T${horaFin}:00`
        : null;
    await onGuardar({
      empresaId,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      inicio,
      fin,
      todoElDia,
      tipo,
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar evento" : "Nuevo evento"}</DialogTitle>
          <DialogDescription>
            Los eventos se muestran en el calendario junto a seguimientos,
            tareas y cobros.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field id="ev-titulo" label="Título" requerido error={error}>
            <Input
              id="ev-titulo"
              value={titulo}
              onChange={(e) => setTitulo(e.target.value)}
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="ev-tipo" label="Tipo">
              <Select value={tipo} onValueChange={(v) => setTipo(v as TipoEvento)}>
                <SelectTrigger id="ev-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIPOS_EVENTO.map((t) => (
                    <SelectItem key={t} value={t}>
                      {ETIQUETA_TIPO_EVENTO[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="ev-fecha" label="Fecha">
              <Input
                id="ev-fecha"
                type="date"
                value={fecha}
                onChange={(e) => setFecha(e.target.value || fechaInicial)}
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-champagne"
              checked={todoElDia}
              onChange={(e) => setTodoElDia(e.target.checked)}
            />
            Todo el día
          </label>

          {!todoElDia && (
            <div className="grid grid-cols-2 gap-4">
              <Field id="ev-hi" label="Hora inicio">
                <Input
                  id="ev-hi"
                  type="time"
                  value={horaInicio}
                  onChange={(e) => setHoraInicio(e.target.value)}
                />
              </Field>
              <Field id="ev-hf" label="Hora fin">
                <Input
                  id="ev-hf"
                  type="time"
                  value={horaFin}
                  onChange={(e) => setHoraFin(e.target.value)}
                />
              </Field>
            </div>
          )}

          <Field id="ev-empresa" label="Empresa relacionada">
            <Select
              value={empresaId ?? "ninguna"}
              onValueChange={(v) => setEmpresaId(v === "ninguna" ? null : v)}
            >
              <SelectTrigger id="ev-empresa">
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

          <Field id="ev-desc" label="Descripción">
            <Textarea
              id="ev-desc"
              rows={2}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
          </Field>
        </div>

        <DialogFooter className="sm:justify-between">
          {onEliminar ? (
            <Button
              variant="ghost"
              className="text-destructive hover:text-destructive"
              onClick={onEliminar}
              disabled={procesando}
            >
              Eliminar
            </Button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button onClick={enviar} disabled={procesando}>
              {editando ? "Guardar" : "Crear"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
