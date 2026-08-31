"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  BellOff,
  CalendarClock,
  CalendarPlus,
  CalendarRange,
  Search,
  StickyNote,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { EstadoBadge } from "@/components/empresas/estado-badge";
import { ProximoSeguimientoCell } from "@/components/empresas/proximo-seguimiento-cell";
import { SeguimientoDialog } from "@/components/empresas/seguimiento-dialog";
import { RegistrarActividadDialog } from "@/components/empresas/registrar-actividad-dialog";
import { EmpresaDetailSheet } from "@/components/empresas/empresa-detail-sheet";
import { HistorialActividades } from "@/components/empresas/historial-actividades";
import { Field } from "@/components/empresas/field";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { ESTADO_CONFIG } from "@/lib/constants";
import { hoyISO } from "@/lib/date";
import {
  clasificarSeguimiento,
  empresasParaSeguimiento,
  prioridadDeBucket,
  resumirSeguimientos,
} from "@/lib/seguimientos";
import type { Empresa } from "@/lib/types";

const PRIORIDAD_CLASE: Record<string, string> = {
  Alta: "bg-estado-perdida/12 text-estado-perdida-fg",
  Media: "bg-estado-platicas-suave text-estado-platicas-fg",
  Baja: "bg-muted text-muted-foreground",
  "—": "bg-muted text-muted-foreground",
};

export function SeguimientosView() {
  const router = useRouter();
  const {
    empresas,
    contactos,
    actividades,
    cargando,
    procesando,
    usuario,
    actualizarProximoSeguimiento,
    completarProximoSeguimiento,
    alternarRequiereSeguimiento,
    actualizarNotas,
    actualizarMonto,
    marcarSeguimiento,
    registrarActividad,
  } = useEmpresas();

  const hoy = hoyISO();
  const [busqueda, setBusqueda] = useState("");
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [seguimientoId, setSeguimientoId] = useState<string | null>(null);
  const [actividadEmpresa, setActividadEmpresa] = useState<Empresa | null>(null);
  const [notasEmpresa, setNotasEmpresa] = useState<Empresa | null>(null);
  const [crearAbierto, setCrearAbierto] = useState(false);

  const resumen = useMemo(
    () => resumirSeguimientos(empresas, hoy),
    [empresas, hoy],
  );

  const lista = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    const base = empresasParaSeguimiento(empresas, hoy);
    return termino
      ? base.filter((e) => e.nombre.toLowerCase().includes(termino))
      : base;
  }, [empresas, hoy, busqueda]);

  const agendaHoy = useMemo(
    () =>
      empresas.filter(
        (e) => clasificarSeguimiento(e, hoy) === "hoy",
      ),
    [empresas, hoy],
  );

  const historial = useMemo(
    () =>
      actividades
        .filter((a) => a.tipo === "Seguimiento completado")
        .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
        .slice(0, 12),
    [actividades],
  );

  const recientes = useMemo(
    () =>
      [...actividades]
        .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora))
        .slice(0, 8),
    [actividades],
  );

  function contactoDe(empresaId: string): string {
    const propios = contactos.filter((c) => c.empresaId === empresaId);
    const principal = propios.find((c) => c.principal) ?? propios[0];
    return principal?.nombre?.trim() || "—";
  }

  const detalleEmpresa = detalleId
    ? (empresas.find((e) => e.id === detalleId) ?? null)
    : null;
  const seguimientoEmpresa = seguimientoId
    ? (empresas.find((e) => e.id === seguimientoId) ?? null)
    : null;

  const indicadores = [
    {
      etiqueta: "Vencidos",
      valor: resumen.vencido,
      icono: CalendarClock,
      clase: "text-estado-perdida",
      fondo: "bg-estado-perdida/12",
    },
    {
      etiqueta: "Para hoy",
      valor: resumen.hoy,
      icono: CalendarRange,
      clase: "text-alerta",
      fondo: "bg-estado-platicas-suave",
    },
    {
      etiqueta: "Próximos 7 días",
      valor: resumen.proximos7,
      icono: CalendarRange,
      clase: "text-estado-avance",
      fondo: "bg-estado-avance-suave",
    },
    {
      etiqueta: "Sin fecha",
      valor: resumen.sinFecha,
      icono: BellOff,
      clase: "text-seguimiento",
      fondo: "bg-seguimiento/12",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Seguimientos"
        subtitle="Prioriza y da seguimiento a cada oportunidad."
        action={
          <Button
            onClick={() => setCrearAbierto(true)}
            className="w-full sm:w-auto"
          >
            <CalendarPlus className="h-4 w-4 text-champagne" />
            Crear seguimiento
          </Button>
        }
      />

      {/* Indicadores */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {indicadores.map((ind) => (
          <Card key={ind.etiqueta} className="flex items-center gap-3 p-4">
            <span
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
                ind.fondo,
              )}
            >
              <ind.icono className={cn("h-5 w-5", ind.clase)} />
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

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        {/* Tabla de prioridad */}
        <Card className="overflow-hidden">
          <div className="border-b p-4">
            <div className="relative w-full sm:max-w-xs">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar empresa..."
                className="pl-9"
                aria-label="Buscar empresa"
              />
            </div>
          </div>

          {cargando ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : lista.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
              <CalendarClock className="h-8 w-8 text-muted-foreground" />
              <p className="font-medium">Nada pendiente</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                No hay empresas con seguimiento vencido, programado o marcado.
              </p>
            </div>
          ) : (
            <>
              {/* Escritorio */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Empresa</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead>Próximo seguimiento</TableHead>
                      <TableHead>Prioridad</TableHead>
                      <TableHead>Responsable</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lista.map((empresa) => {
                      const bucket = clasificarSeguimiento(empresa, hoy);
                      const prioridad = prioridadDeBucket(bucket);
                      return (
                        <TableRow key={empresa.id}>
                          <TableCell className="max-w-[200px]">
                            <button
                              type="button"
                              onClick={() => setDetalleId(empresa.id)}
                              className="text-left font-medium text-foreground hover:text-primary hover:underline"
                            >
                              {empresa.nombre}
                            </button>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {contactoDe(empresa.id)}
                          </TableCell>
                          <TableCell>
                            <EstadoBadge estado={empresa.estado} />
                          </TableCell>
                          <TableCell>
                            <ProximoSeguimientoCell
                              empresa={empresa}
                              onGuardar={actualizarProximoSeguimiento}
                              onCompletar={completarProximoSeguimiento}
                            />
                          </TableCell>
                          <TableCell>
                            <span
                              className={cn(
                                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                                PRIORIDAD_CLASE[prioridad],
                              )}
                            >
                              {prioridad}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-[140px] truncate text-xs text-muted-foreground">
                            {usuario ?? "—"}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setSeguimientoId(empresa.id)}
                              >
                                Completar
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                aria-label="Editar notas"
                                title="Editar notas"
                                onClick={() => setNotasEmpresa(empresa)}
                              >
                                <StickyNote className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Celular */}
              <ul className="divide-y md:hidden">
                {lista.map((empresa) => {
                  const prioridad = prioridadDeBucket(
                    clasificarSeguimiento(empresa, hoy),
                  );
                  return (
                    <li key={empresa.id} className="space-y-3 p-4">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => setDetalleId(empresa.id)}
                          className="text-left font-medium hover:text-primary hover:underline"
                        >
                          {empresa.nombre}
                        </button>
                        <span
                          className={cn(
                            "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                            PRIORIDAD_CLASE[prioridad],
                          )}
                        >
                          {prioridad}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <EstadoBadge estado={empresa.estado} />
                        <span className="text-xs text-muted-foreground">
                          {contactoDe(empresa.id)}
                        </span>
                      </div>
                      <ProximoSeguimientoCell
                        empresa={empresa}
                        onGuardar={actualizarProximoSeguimiento}
                        onCompletar={completarProximoSeguimiento}
                        ancho
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="flex-1"
                          onClick={() => setSeguimientoId(empresa.id)}
                        >
                          Completar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNotasEmpresa(empresa)}
                        >
                          <StickyNote className="h-4 w-4" />
                          Notas
                        </Button>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </Card>

        {/* Panel lateral */}
        <div className="space-y-4">
          <Card className="p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Agenda de hoy
            </h3>
            {agendaHoy.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sin seguimientos para hoy.
              </p>
            ) : (
              <ul className="space-y-2">
                {agendaHoy.map((e) => (
                  <li
                    key={e.id}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <button
                      type="button"
                      onClick={() => setDetalleId(e.id)}
                      className="truncate text-left font-medium hover:text-primary hover:underline"
                    >
                      {e.nombre}
                    </button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 shrink-0 px-2 text-xs"
                      onClick={() => setSeguimientoId(e.id)}
                    >
                      Completar
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Actividad reciente
            </h3>
            <HistorialActividades actividades={recientes} />
          </Card>

          <Card className="p-4">
            <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Historial de seguimientos
            </h3>
            <HistorialActividades actividades={historial} />
          </Card>
        </div>
      </div>

      {/* Diálogos */}
      <SeguimientoDialog
        empresa={seguimientoEmpresa}
        onOpenChange={(v) => !v && setSeguimientoId(null)}
        onConfirmar={marcarSeguimiento}
        procesando={procesando}
      />

      <RegistrarActividadDialog
        empresa={actividadEmpresa}
        onOpenChange={(v) => !v && setActividadEmpresa(null)}
        onGuardar={registrarActividad}
        procesando={procesando}
      />

      <NotasDialog
        empresa={notasEmpresa}
        procesando={procesando}
        onOpenChange={(v) => !v && setNotasEmpresa(null)}
        onGuardar={async (id, notas) => {
          await actualizarNotas(id, notas);
          setNotasEmpresa(null);
        }}
      />

      {detalleEmpresa && (
        <EmpresaDetailSheet
          empresa={detalleEmpresa}
          contactos={contactos}
          actividades={actividades}
          onOpenChange={(v) => !v && setDetalleId(null)}
          onEditar={() => {
            toast.info("Edita esta empresa en la sección Empresas.");
            router.push("/empresas");
          }}
          onEliminar={() => {
            toast.info("Elimina esta empresa en la sección Empresas.");
            router.push("/empresas");
          }}
          onMarcarSeguimiento={(e) => {
            setDetalleId(null);
            setSeguimientoId(e.id);
          }}
          onRegistrarActividad={(e) => setActividadEmpresa(e)}
          onGuardarNotas={actualizarNotas}
          onGuardarMonto={actualizarMonto}
        />
      )}

      <CrearSeguimientoDialog
        abierto={crearAbierto}
        empresas={empresas}
        procesando={procesando}
        onOpenChange={setCrearAbierto}
        onProgramar={actualizarProximoSeguimiento}
        onMarcarSinFecha={async (id) => {
          await alternarRequiereSeguimiento(id, true);
        }}
      />
    </div>
  );
}

/** Diálogo compacto para editar solo las notas de una empresa. */
function NotasDialog({
  empresa,
  procesando,
  onOpenChange,
  onGuardar,
}: {
  empresa: Empresa | null;
  procesando: boolean;
  onOpenChange: (abierto: boolean) => void;
  onGuardar: (id: string, notas: string) => Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const empresaId = empresa?.id ?? null;

  useEffect(() => {
    if (empresa) setTexto(empresa.notas);
  }, [empresa]);

  return (
    <Dialog open={empresa !== null} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Notas de {empresa?.nombre}</DialogTitle>
          <DialogDescription>
            Anota acuerdos, contexto o próximos pasos.
          </DialogDescription>
        </DialogHeader>
        <Textarea
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          rows={6}
          placeholder="Sin notas."
        />
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={procesando}
          >
            Cancelar
          </Button>
          <Button
            onClick={() => empresaId && void onGuardar(empresaId, texto)}
            disabled={procesando}
          >
            Guardar notas
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Diálogo para programar un seguimiento (fecha) o marcarlo sin fecha. */
function CrearSeguimientoDialog({
  abierto,
  empresas,
  procesando,
  onOpenChange,
  onProgramar,
  onMarcarSinFecha,
}: {
  abierto: boolean;
  empresas: Empresa[];
  procesando: boolean;
  onOpenChange: (abierto: boolean) => void;
  onProgramar: (id: string, fecha: string | null) => Promise<void>;
  onMarcarSinFecha: (id: string) => Promise<void>;
}) {
  const [empresaId, setEmpresaId] = useState("");
  const [fecha, setFecha] = useState("");
  const [sinFecha, setSinFecha] = useState(false);

  const abiertas = useMemo(
    () => empresas.filter((e) => !ESTADO_CONFIG[e.estado].cerrado),
    [empresas],
  );

  useEffect(() => {
    if (abierto) {
      setEmpresaId("");
      setFecha("");
      setSinFecha(false);
    }
  }, [abierto]);

  async function confirmar() {
    if (!empresaId) return;
    if (sinFecha) await onMarcarSinFecha(empresaId);
    else await onProgramar(empresaId, fecha || null);
    onOpenChange(false);
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Crear seguimiento</DialogTitle>
          <DialogDescription>
            Programa una fecha o solo marca la empresa como pendiente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field id="cs-empresa" label="Empresa" requerido>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger id="cs-empresa">
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>
              <SelectContent>
                {abiertas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field
            id="cs-fecha"
            label="Fecha del próximo seguimiento"
            hint="Déjala vacía y marca la casilla si aún no hay fecha."
          >
            <Input
              id="cs-fecha"
              type="date"
              value={fecha}
              min={hoyISO()}
              disabled={sinFecha}
              onChange={(e) => setFecha(e.target.value)}
            />
          </Field>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-champagne"
              checked={sinFecha}
              onChange={(e) => setSinFecha(e.target.checked)}
            />
            Sin fecha — solo marcar “Próximo seguimiento”
          </label>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={procesando}
          >
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={procesando || !empresaId}>
            Guardar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
