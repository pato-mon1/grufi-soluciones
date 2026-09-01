"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  Download,
  Printer,
  TrendingUp,
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
import { PageHeader } from "@/components/app-shell/page-header";
import { EstadoBadge } from "@/components/empresas/estado-badge";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { usePermisos } from "@/lib/hooks/use-permisos";
import { clavesOrdenadas } from "@/lib/estados";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { ESTADO_CONFIG } from "@/lib/constants";
import { hoyISO } from "@/lib/date";
import { formatearMonto } from "@/lib/money";
import { type EstadoEmpresa } from "@/lib/types";
import {
  calcularMetricasComerciales,
  empresasPorEstado,
  filasDetalle,
  metricasTareas,
  type RangoFechas,
} from "@/lib/reportes";

/** Resta `dias` días a una fecha YYYY-MM-DD (horario local). */
/** Fecha máxima seleccionable en los filtros (permite proyectar a futuro). */
const FECHA_MAXIMA = "2035-12-31";

function restarDias(iso: string, dias: number): string {
  const base = new Date(`${iso}T00:00:00`).getTime();
  return new Date(base - dias * 86_400_000).toISOString().slice(0, 10);
}

function descargarCSV(nombre: string, filas: string[][]) {
  const contenido = filas
    .map((fila) =>
      fila
        .map((celda) => {
          const texto = String(celda ?? "");
          return /[",\n;]/.test(texto)
            ? `"${texto.replace(/"/g, '""')}"`
            : texto;
        })
        .join(","),
    )
    .join("\r\n");
  const blob = new Blob([`﻿${contenido}`], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombre;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

const ESTADOS_ABIERTOS: EstadoEmpresa[] = [
  "Pendiente",
  "En pláticas",
  "En avance",
  "Futura",
];

export function ReportesView() {
  const { empresas, cargando } = useEmpresas();
  const { estadosConfig, tareas } = useFase2();
  const { puede } = usePermisos();
  const puedeExportar = puede("reportes", "manage");
  const clavesEstado = clavesOrdenadas(estadosConfig);
  const hoy = hoyISO();

  const [desde, setDesde] = useState(() => restarDias(hoy, 90));
  const [hasta, setHasta] = useState(hoy);

  const rango: RangoFechas = { desde, hasta };
  const rangoInvalido = desde > hasta;

  const metricas = useMemo(
    () => calcularMetricasComerciales(empresas, rango),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [empresas, desde, hasta],
  );
  const mTareas = useMemo(
    () => metricasTareas(tareas, rango),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tareas, desde, hasta],
  );
  const porEstado = useMemo(() => empresasPorEstado(empresas), [empresas]);
  const filas = useMemo(() => filasDetalle(empresas, hoy), [empresas, hoy]);

  const maxEstado = Math.max(1, ...Object.values(porEstado));
  const topMonto = filas.filter((f) => (f.monto ?? 0) > 0).slice(0, 8);
  const maxTop = Math.max(1, ...topMonto.map((f) => f.monto ?? 0));
  const totalCerradas = metricas.ganadas + metricas.perdidas;

  const kpis = [
    {
      etiqueta: "Conversión",
      valor: `${metricas.conversion}%`,
      pista: "Ganadas / (ganadas + perdidas) en el rango",
      icono: TrendingUp,
    },
    {
      etiqueta: "Pipeline abierto",
      valor: formatearMonto(metricas.pipeline),
      pista: "Suma de montos de oportunidades no cerradas",
      icono: BarChart3,
    },
    {
      etiqueta: "Valor ganado",
      valor: formatearMonto(metricas.valorGanado),
      pista: "Monto de oportunidades ganadas en el rango",
      icono: TrendingUp,
    },
    {
      etiqueta: "Ganadas",
      valor: String(metricas.ganadas),
      pista: "Oportunidades cerradas como ganadas en el rango",
      icono: TrendingUp,
    },
    {
      etiqueta: "Perdidas",
      valor: String(metricas.perdidas),
      pista: "Oportunidades cerradas como no concretadas en el rango",
      icono: TrendingUp,
    },
    {
      etiqueta: "Ciclo promedio",
      valor: `${metricas.cicloPromedioDias} d`,
      pista: "Días de creación a cierre (cerradas en el rango)",
      icono: TrendingUp,
    },
  ];

  function exportar() {
    const encabezado = [
      "Empresa",
      "Estado",
      "Monto (MXN)",
      "Probabilidad (%)",
      "Resultado",
      "Días en proceso",
    ];
    const cuerpo = filas.map((f) => [
      f.empresa,
      f.estado,
      f.monto === null ? "" : String(f.monto),
      String(f.probabilidad),
      f.resultado,
      String(f.diasEnProceso),
    ]);
    descargarCSV(`reporte-grufi-${desde}_a_${hasta}.csv`, [
      encabezado,
      ...cuerpo,
    ]);
  }

  return (
    <div className="print-full mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Reportes"
        subtitle="Indicadores comerciales del periodo seleccionado."
        action={
          puedeExportar ? (
            <div className="flex gap-2" data-print-hide>
              <Button
                variant="outline"
                onClick={exportar}
                className="w-full sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button
                variant="outline"
                onClick={() => window.print()}
                className="w-full sm:w-auto"
              >
                <Printer className="h-4 w-4" />
                Imprimir / PDF
              </Button>
            </div>
          ) : undefined
        }
      />

      {/* Rango de fechas */}
      <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-end" data-print-hide>
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
            max={FECHA_MAXIMA}
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
              setDesde(restarDias(hoy, 90));
              setHasta(hoy);
            }}
          >
            90 días
          </Button>
          <Button
            variant="outline"
            onClick={() => {
              setDesde(`${hoy.slice(0, 4)}-01-01`);
              setHasta(hoy);
            }}
          >
            Año
          </Button>
        </div>
      </Card>

      {rangoInvalido && (
        <p className="text-sm font-medium text-destructive" role="alert">
          La fecha “Desde” no puede ser posterior a “Hasta”.
        </p>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        {kpis.map((kpi) => (
          <Card key={kpi.etiqueta} className="p-4 print-break-avoid">
            <p className="text-xs text-muted-foreground">{kpi.etiqueta}</p>
            {cargando ? (
              <Skeleton className="mt-1 h-7 w-24" />
            ) : (
              <p className="mt-1 text-xl font-semibold tracking-tight">
                {kpi.valor}
              </p>
            )}
            <p className="mt-1 text-[11px] leading-tight text-muted-foreground">
              {kpi.pista}
            </p>
          </Card>
        ))}
      </div>

      {/* Tareas del periodo */}
      <Card className="p-4 print-break-avoid">
        <h3 className="mb-3 text-sm font-semibold">Tareas del periodo</h3>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Creadas", mTareas.creadas],
            ["Completadas", mTareas.completadas],
            ["Abiertas", mTareas.abiertas],
            ["Vencidas", mTareas.vencidas],
          ].map(([etq, val]) => (
            <div key={etq}>
              <p
                className={cn(
                  "text-xl font-semibold tracking-tight",
                  etq === "Vencidas" && Number(val) > 0 && "text-estado-perdida",
                )}
              >
                {val}
              </p>
              <p className="text-xs text-muted-foreground">{etq}</p>
            </div>
          ))}
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Empresas por estado */}
        <Card className="p-4 print-break-avoid">
          <h3 className="mb-3 text-sm font-semibold">Empresas por estado</h3>
          {cargando ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ul className="space-y-2">
              {clavesEstado.map((estado) => {
                const cantidad = porEstado[estado];
                return (
                  <li key={estado} className="text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex items-center gap-1.5">
                        <span
                          className={cn(
                            "h-2 w-2 rounded-full",
                            ESTADO_CONFIG[estado].dot,
                          )}
                        />
                        {estadosConfig[estado]?.etiqueta ?? estado}
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {cantidad}
                      </span>
                    </div>
                    <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={cn(
                          "h-full rounded-full",
                          ESTADO_CONFIG[estado].dot,
                        )}
                        style={{ width: `${(cantidad / maxEstado) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Ganadas vs perdidas */}
        <Card className="p-4 print-break-avoid">
          <h3 className="mb-3 text-sm font-semibold">
            Ganadas vs. perdidas en el rango
          </h3>
          {cargando ? (
            <Skeleton className="h-40 w-full" />
          ) : totalCerradas === 0 ? (
            <p className="text-sm text-muted-foreground">
              No hay oportunidades cerradas en este periodo.
            </p>
          ) : (
            <div className="space-y-3">
              <Barra
                etiqueta="Ganadas"
                valor={metricas.ganadas}
                total={totalCerradas}
                clase="bg-estado-ganada"
              />
              <Barra
                etiqueta="Perdidas"
                valor={metricas.perdidas}
                total={totalCerradas}
                clase="bg-estado-perdida"
              />
              <p className="pt-1 text-xs text-muted-foreground">
                Tasa de conversión del periodo:{" "}
                <span className="font-medium text-foreground">
                  {metricas.conversion}%
                </span>
              </p>
            </div>
          )}
        </Card>

        {/* Embudo */}
        <Card className="p-4 print-break-avoid">
          <h3 className="mb-3 text-sm font-semibold">Embudo (oportunidades abiertas)</h3>
          {cargando ? (
            <Skeleton className="h-40 w-full" />
          ) : (
            <ul className="space-y-2">
              {ESTADOS_ABIERTOS.map((estado) => {
                const cantidad = porEstado[estado];
                const ancho = Math.max(
                  6,
                  (cantidad /
                    Math.max(
                      1,
                      ...ESTADOS_ABIERTOS.map((e) => porEstado[e]),
                    )) *
                    100,
                );
                return (
                  <li
                    key={estado}
                    className="flex items-center gap-3 text-sm"
                  >
                    <span className="w-24 shrink-0 text-muted-foreground">
                      {estado}
                    </span>
                    <div
                      className={cn(
                        "flex h-7 items-center justify-end rounded-md px-2 text-xs font-medium text-white",
                        ESTADO_CONFIG[estado].dot,
                      )}
                      style={{ width: `${ancho}%` }}
                    >
                      {cantidad}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        {/* Top por monto */}
        <Card className="p-4 print-break-avoid">
          <h3 className="mb-3 text-sm font-semibold">
            Mayores oportunidades por monto
          </h3>
          {cargando ? (
            <Skeleton className="h-40 w-full" />
          ) : topMonto.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Ninguna oportunidad tiene monto registrado.
            </p>
          ) : (
            <ul className="space-y-2">
              {topMonto.map((f) => (
                <li key={f.empresa} className="text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate">{f.empresa}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatearMonto(f.monto)}
                    </span>
                  </div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-champagne"
                      style={{ width: `${((f.monto ?? 0) / maxTop) * 100}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {/* Tabla de detalle */}
      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <h3 className="text-sm font-semibold">Detalle de oportunidades</h3>
          <p className="text-xs text-muted-foreground">
            Todas las empresas, ordenadas por monto. Probabilidad estimada por
            estado.
          </p>
        </div>
        {cargando ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        ) : filas.length === 0 ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">
            Aún no hay empresas registradas.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Empresa</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead className="text-right">Monto</TableHead>
                  <TableHead className="text-right">Prob.</TableHead>
                  <TableHead>Resultado</TableHead>
                  <TableHead className="text-right">Días</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filas.map((f) => (
                  <TableRow key={f.empresa}>
                    <TableCell className="font-medium">{f.empresa}</TableCell>
                    <TableCell>
                      <EstadoBadge estado={f.estado} />
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatearMonto(f.monto)}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.probabilidad}%
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-sm",
                          f.resultado === "Ganada" && "text-estado-ganada-fg",
                          f.resultado === "Perdida" && "text-estado-perdida-fg",
                          f.resultado === "Abierta" && "text-muted-foreground",
                        )}
                      >
                        {f.resultado}
                      </span>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {f.diasEnProceso}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </Card>
    </div>
  );
}

function Barra({
  etiqueta,
  valor,
  total,
  clase,
}: {
  etiqueta: string;
  valor: number;
  total: number;
  clase: string;
}) {
  const pct = total === 0 ? 0 : Math.round((valor / total) * 100);
  return (
    <div className="text-sm">
      <div className="flex items-center justify-between gap-2">
        <span>{etiqueta}</span>
        <span className="tabular-nums text-muted-foreground">
          {valor} · {pct}%
        </span>
      </div>
      <div className="mt-1 h-2.5 overflow-hidden rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full", clase)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
