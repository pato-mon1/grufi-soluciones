"use client";

import { useMemo, useState } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  Check,
  Pencil,
  Plus,
  RotateCcw,
  Tag,
  Trash2,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { DonutFinanzas } from "@/components/finanzas/donut-finanzas";
import {
  MovimientoFormDialog,
  type PresetMovimiento,
} from "@/components/finanzas/movimiento-form-dialog";
import { CategoriasDialog } from "@/components/finanzas/categorias-dialog";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { formatearFecha, hoyISO } from "@/lib/date";
import { formatearMonto } from "@/lib/money";
import {
  avanceMeta,
  flujoAnual,
  rentabilidadPorEmpresa,
  resumirFinanzas,
  totalesPorCategoria,
  type RangoFinanzas,
} from "@/lib/finanzas";
import type { MovimientoFinanciero } from "@/lib/types";

function restarDias(iso: string, dias: number): string {
  const base = new Date(`${iso}T00:00:00`).getTime();
  return new Date(base - dias * 86_400_000).toISOString().slice(0, 10);
}

const ETIQUETA_ESTADO_MOV: Record<MovimientoFinanciero["estado"], string> = {
  pendiente: "Pendiente",
  liquidado: "Liquidado",
  cancelado: "Cancelado",
};

type FiltroTipo = "todos" | "ingreso" | "egreso";
type FiltroEstado = "todos" | MovimientoFinanciero["estado"];

export function FinanzasView() {
  const { empresas } = useEmpresas();
  const {
    movimientos,
    categorias,
    ajustes,
    cargando,
    procesando,
    crearMovimiento,
    actualizarMovimiento,
    liquidarMovimiento,
    eliminarMovimiento,
    crearCategoria,
    actualizarCategoria,
    eliminarCategoria,
  } = useFase2();

  const hoy = hoyISO();
  const anioActual = Number(hoy.slice(0, 4));

  const [desde, setDesde] = useState(() => `${anioActual}-01-01`);
  const [hasta, setHasta] = useState(hoy);
  const [anioFlujo, setAnioFlujo] = useState(anioActual);
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");
  const [filtroEstado, setFiltroEstado] = useState<FiltroEstado>("todos");

  const [formAbierto, setFormAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<MovimientoFinanciero | null>(null);
  const [preset, setPreset] = useState<PresetMovimiento | undefined>();
  const [tituloForm, setTituloForm] = useState<string | undefined>();
  const [catAbierto, setCatAbierto] = useState(false);
  const [aEliminar, setAEliminar] = useState<MovimientoFinanciero | null>(null);

  const rango: RangoFinanzas = { desde, hasta };

  const resumen = useMemo(
    () => resumirFinanzas(movimientos, ajustes.saldoInicial, rango),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movimientos, ajustes.saldoInicial, desde, hasta],
  );

  const donutIngresos = useMemo(
    () => totalesPorCategoria(movimientos, categorias, "ingreso", rango),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movimientos, categorias, desde, hasta],
  );
  const donutEgresos = useMemo(
    () => totalesPorCategoria(movimientos, categorias, "egreso", rango),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movimientos, categorias, desde, hasta],
  );

  const flujo = useMemo(
    () => flujoAnual(movimientos, anioFlujo),
    [movimientos, anioFlujo],
  );
  const maxFlujo = Math.max(
    1,
    ...flujo.map((m) => Math.max(m.ingresos, m.egresos)),
  );

  const rentabilidad = useMemo(
    () => rentabilidadPorEmpresa(movimientos, empresas, rango),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [movimientos, empresas, desde, hasta],
  );
  const maxRent = Math.max(
    1,
    ...rentabilidad.map((r) => Math.abs(r.utilidad)),
  );

  const ingresosAnio = flujo.reduce((acc, m) => acc + m.ingresos, 0);
  const avance = avanceMeta(ingresosAnio, ajustes.metaAnual);

  const categoriaNombre = useMemo(() => {
    const m = new Map<string, string>();
    for (const c of categorias) m.set(c.id, c.nombre);
    return m;
  }, [categorias]);
  const empresaNombre = useMemo(() => {
    const m = new Map<string, string>();
    for (const e of empresas) m.set(e.id, e.nombre);
    return m;
  }, [empresas]);

  const movimientosFiltrados = useMemo(() => {
    return movimientos.filter((m) => {
      if (filtroTipo !== "todos" && m.tipo !== filtroTipo) return false;
      if (filtroEstado !== "todos" && m.estado !== filtroEstado) return false;
      const dia = m.fecha.slice(0, 10);
      return dia >= desde && dia <= hasta;
    });
  }, [movimientos, filtroTipo, filtroEstado, desde, hasta]);

  function abrirNuevo(p?: PresetMovimiento, titulo?: string) {
    setEnEdicion(null);
    setPreset(p);
    setTituloForm(titulo);
    setFormAbierto(true);
  }

  const kpis = [
    {
      etiqueta: "Saldo en caja",
      valor: formatearMonto(resumen.saldoCaja),
      icono: Wallet,
      tono: "text-champagne",
    },
    {
      etiqueta: "Ingresos",
      valor: formatearMonto(resumen.ingresos),
      icono: ArrowUpRight,
      tono: "text-estado-ganada",
    },
    {
      etiqueta: "Egresos",
      valor: formatearMonto(resumen.egresos),
      icono: ArrowDownRight,
      tono: "text-estado-perdida",
    },
    {
      etiqueta: "Utilidad neta",
      valor: formatearMonto(resumen.utilidadNeta),
      icono: resumen.utilidadNeta >= 0 ? ArrowUpRight : ArrowDownRight,
      tono:
        resumen.utilidadNeta >= 0
          ? "text-estado-ganada"
          : "text-estado-perdida",
    },
    {
      etiqueta: "Margen",
      valor: `${resumen.margen}%`,
      icono: ArrowUpRight,
      tono: "text-estado-avance",
    },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Finanzas"
        subtitle="Ingresos, egresos, cobros pendientes y rentabilidad."
        action={
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => setCatAbierto(true)}>
              <Tag className="h-4 w-4" />
              Categorías
            </Button>
            <Button
              variant="outline"
              onClick={() =>
                abrirNuevo(
                  { tipo: "ingreso", estado: "pendiente" },
                  "Crear cobro pendiente",
                )
              }
            >
              <Plus className="h-4 w-4" />
              Cobro pendiente
            </Button>
            <Button onClick={() => abrirNuevo()}>
              <Plus className="h-4 w-4 text-champagne" />
              Nuevo movimiento
            </Button>
          </div>
        }
      />

      {/* Rango */}
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
        <label className="flex-1 space-y-1.5 text-sm">
          <span className="font-medium">Desde</span>
          <Input
            type="date"
            value={desde}
            max={hasta}
            onChange={(e) => setDesde(e.target.value)}
          />
        </label>
        <label className="flex-1 space-y-1.5 text-sm">
          <span className="font-medium">Hasta</span>
          <Input
            type="date"
            value={hasta}
            min={desde}
            onChange={(e) => setHasta(e.target.value)}
          />
        </label>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              setDesde(restarDias(hoy, 30));
              setHasta(hoy);
            }}
          >
            30 días
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDesde(`${anioActual}-01-01`);
              setHasta(hoy);
            }}
          >
            Este año
          </Button>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {kpis.map((kpi) => (
          <Card key={kpi.etiqueta} className="p-4">
            <div className="flex items-center gap-1.5">
              <kpi.icono className={cn("h-4 w-4", kpi.tono)} />
              <p className="text-xs text-muted-foreground">{kpi.etiqueta}</p>
            </div>
            {cargando ? (
              <Skeleton className="mt-1 h-6 w-24" />
            ) : (
              <p className="mt-1 text-lg font-semibold tracking-tight">
                {kpi.valor}
              </p>
            )}
          </Card>
        ))}
      </div>

      {/* Pendientes + meta */}
      <div className="grid gap-3 sm:grid-cols-3">
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Por cobrar</p>
          <p className="mt-1 text-lg font-semibold text-estado-ganada-fg">
            {formatearMonto(resumen.porCobrar)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">Por pagar</p>
          <p className="mt-1 text-lg font-semibold text-estado-perdida-fg">
            {formatearMonto(resumen.porPagar)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-muted-foreground">
            Meta anual {ajustes.metaAnual > 0 ? `· ${avance}%` : ""}
          </p>
          {ajustes.metaAnual > 0 ? (
            <>
              <p className="mt-1 text-sm font-medium">
                {formatearMonto(ingresosAnio)} / {formatearMonto(ajustes.metaAnual)}
              </p>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-champagne"
                  style={{ width: `${Math.min(100, avance)}%` }}
                />
              </div>
            </>
          ) : (
            <p className="mt-1 text-xs text-muted-foreground">
              Defínela en Configuración → Finanzas.
            </p>
          )}
        </Card>
      </div>

      {/* Ruedas por categoría */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Ingresos por categoría</h3>
          {cargando ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <DonutFinanzas
              segmentos={donutIngresos.map((d) => ({
                nombre: d.nombre,
                valor: d.total,
                color: d.color,
              }))}
              total={resumen.ingresos}
            />
          )}
        </Card>
        <Card className="p-4">
          <h3 className="mb-3 text-sm font-semibold">Egresos por categoría</h3>
          {cargando ? (
            <Skeleton className="h-28 w-full" />
          ) : (
            <DonutFinanzas
              segmentos={donutEgresos.map((d) => ({
                nombre: d.nombre,
                valor: d.total,
                color: d.color,
              }))}
              total={resumen.egresos}
            />
          )}
        </Card>
      </div>

      {/* Flujo anual */}
      <Card className="p-4">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h3 className="text-sm font-semibold">Flujo mensual (liquidado)</h3>
          <Select
            value={String(anioFlujo)}
            onValueChange={(v) => setAnioFlujo(Number(v))}
          >
            <SelectTrigger className="h-8 w-28" aria-label="Año del flujo">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {[anioActual, anioActual - 1, anioActual - 2].map((a) => (
                <SelectItem key={a} value={String(a)}>
                  {a}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {cargando ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="flex items-end gap-1.5 overflow-x-auto pb-1">
            {flujo.map((m) => (
              <div
                key={m.mes}
                className="flex min-w-[44px] flex-1 flex-col items-center gap-1"
              >
                <div className="flex h-32 w-full items-end justify-center gap-0.5">
                  <div
                    className="w-1/2 rounded-t bg-estado-ganada"
                    style={{ height: `${(m.ingresos / maxFlujo) * 100}%` }}
                    title={`Ingresos: ${formatearMonto(m.ingresos)}`}
                  />
                  <div
                    className="w-1/2 rounded-t bg-estado-perdida"
                    style={{ height: `${(m.egresos / maxFlujo) * 100}%` }}
                    title={`Egresos: ${formatearMonto(m.egresos)}`}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">
                  {m.etiqueta}
                </span>
              </div>
            ))}
          </div>
        )}
        <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-estado-ganada" /> Ingresos
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-estado-perdida" /> Egresos
          </span>
        </div>
      </Card>

      {/* Rentabilidad por empresa */}
      <Card className="p-4">
        <h3 className="mb-3 text-sm font-semibold">
          Rentabilidad por empresa (liquidado en el rango)
        </h3>
        {cargando ? (
          <Skeleton className="h-32 w-full" />
        ) : rentabilidad.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aún no hay movimientos liquidados ligados a una empresa.
          </p>
        ) : (
          <ul className="space-y-2">
            {rentabilidad.map((r) => (
              <li key={r.empresaId} className="text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate">{r.nombre}</span>
                  <span
                    className={cn(
                      "shrink-0 tabular-nums font-medium",
                      r.utilidad >= 0
                        ? "text-estado-ganada-fg"
                        : "text-estado-perdida-fg",
                    )}
                  >
                    {formatearMonto(r.utilidad)}
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className={cn(
                      "h-full rounded-full",
                      r.utilidad >= 0 ? "bg-estado-ganada" : "bg-estado-perdida",
                    )}
                    style={{
                      width: `${(Math.abs(r.utilidad) / maxRent) * 100}%`,
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {/* Movimientos */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-sm font-semibold">Movimientos</h3>
          <div className="flex gap-2">
            <Select
              value={filtroTipo}
              onValueChange={(v) => setFiltroTipo(v as FiltroTipo)}
            >
              <SelectTrigger className="h-8 w-32" aria-label="Filtrar por tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="ingreso">Ingresos</SelectItem>
                <SelectItem value="egreso">Egresos</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={filtroEstado}
              onValueChange={(v) => setFiltroEstado(v as FiltroEstado)}
            >
              <SelectTrigger className="h-8 w-36" aria-label="Filtrar por estado">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Cualquier estado</SelectItem>
                <SelectItem value="pendiente">Pendiente</SelectItem>
                <SelectItem value="liquidado">Liquidado</SelectItem>
                <SelectItem value="cancelado">Cancelado</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {cargando ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : movimientosFiltrados.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            {movimientos.length === 0
              ? "Aún no registras movimientos."
              : "Ningún movimiento coincide con los filtros."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Fecha</TableHead>
                  <TableHead>Concepto</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Categoría</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movimientosFiltrados.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="whitespace-nowrap text-sm tabular-nums">
                      {formatearFecha(m.fecha)}
                    </TableCell>
                    <TableCell className="max-w-[200px]">
                      <span className="flex items-center gap-1.5">
                        {m.tipo === "ingreso" ? (
                          <ArrowUpRight className="h-3.5 w-3.5 shrink-0 text-estado-ganada" />
                        ) : (
                          <ArrowDownRight className="h-3.5 w-3.5 shrink-0 text-estado-perdida" />
                        )}
                        <span className="truncate font-medium">
                          {m.concepto}
                        </span>
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.empresaId
                        ? (empresaNombre.get(m.empresaId) ?? "—")
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.categoriaId
                        ? (categoriaNombre.get(m.categoriaId) ?? "—")
                        : "—"}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "text-right tabular-nums font-medium",
                        m.tipo === "ingreso"
                          ? "text-estado-ganada-fg"
                          : "text-estado-perdida-fg",
                      )}
                    >
                      {m.tipo === "ingreso" ? "+" : "−"}
                      {formatearMonto(m.monto)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                          m.estado === "liquidado" &&
                            "bg-estado-ganada/12 text-estado-ganada-fg",
                          m.estado === "pendiente" &&
                            "bg-estado-platicas-suave text-estado-platicas-fg",
                          m.estado === "cancelado" &&
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {ETIQUETA_ESTADO_MOV[m.estado]}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-0.5">
                        {m.estado !== "cancelado" && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-8 w-8"
                            aria-label={
                              m.estado === "liquidado"
                                ? "Marcar como pendiente"
                                : "Marcar como liquidado"
                            }
                            title={
                              m.estado === "liquidado"
                                ? "Marcar como pendiente"
                                : "Marcar como liquidado"
                            }
                            onClick={() =>
                              void liquidarMovimiento(
                                m.id,
                                m.estado !== "liquidado",
                              )
                            }
                          >
                            {m.estado === "liquidado" ? (
                              <RotateCcw className="h-4 w-4" />
                            ) : (
                              <Check className="h-4 w-4 text-estado-ganada" />
                            )}
                          </Button>
                        )}
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8"
                          aria-label="Editar movimiento"
                          onClick={() => {
                            setEnEdicion(m);
                            setPreset(undefined);
                            setTituloForm(undefined);
                            setFormAbierto(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          aria-label="Eliminar movimiento"
                          onClick={() => setAEliminar(m)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>

      <MovimientoFormDialog
        abierto={formAbierto}
        movimiento={enEdicion}
        preset={preset}
        titulo={tituloForm}
        categorias={categorias}
        empresas={empresas.map((e) => ({ id: e.id, nombre: e.nombre }))}
        procesando={procesando}
        onOpenChange={(v) => {
          setFormAbierto(v);
          if (!v) setEnEdicion(null);
        }}
        onGuardar={async (datos) => {
          if (enEdicion) await actualizarMovimiento(enEdicion.id, datos);
          else await crearMovimiento(datos);
          setFormAbierto(false);
          setEnEdicion(null);
        }}
      />

      <CategoriasDialog
        abierto={catAbierto}
        categorias={categorias}
        procesando={procesando}
        onOpenChange={setCatAbierto}
        onCrear={crearCategoria}
        onActualizar={actualizarCategoria}
        onEliminar={eliminarCategoria}
      />

      <Dialog
        open={aEliminar !== null}
        onOpenChange={(v) => !v && setAEliminar(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar movimiento</DialogTitle>
            <DialogDescription>
              Se eliminará “{aEliminar?.concepto}”. Esta acción no se puede
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
                await eliminarMovimiento(aEliminar.id);
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
