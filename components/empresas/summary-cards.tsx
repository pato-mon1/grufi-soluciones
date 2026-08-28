"use client";

import {
  Building2,
  Clock,
  MessagesSquare,
  TrendingUp,
  CheckCircle2,
  BellRing,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ESTADO_CONFIG } from "@/lib/constants";
import { calcularResumen } from "@/lib/filtros";
import type { Empresa } from "@/lib/types";

/** Identificador de cada tarjeta = filtro que aplica sobre la tabla. */
export type IdTarjetaResumen =
  | "total"
  | "Pendiente"
  | "En pláticas"
  | "En avance"
  | "Cerrada - Ganada"
  | "marcadas";

interface SummaryCardsProps {
  empresas: Empresa[];
  cargando?: boolean;
  /** Tarjeta cuyo filtro está activo (o `null` si no coincide ninguna). */
  tarjetaActiva: IdTarjetaResumen | null;
  /** Se llama al pulsar una tarjeta para aplicar / alternar su filtro. */
  onSeleccionar: (id: IdTarjetaResumen) => void;
}

export function SummaryCards({
  empresas,
  cargando,
  tarjetaActiva,
  onSeleccionar,
}: SummaryCardsProps) {
  // Misma fuente para el número de la tarjeta y para el filtro de la tabla.
  const resumen = calcularResumen(empresas);

  const tarjetas: Array<{
    id: IdTarjetaResumen;
    etiqueta: string;
    valor: number;
    icono: typeof Building2;
    color: string;
    fondo: string;
  }> = [
    {
      id: "total",
      etiqueta: "Total de empresas",
      valor: resumen.total,
      icono: Building2,
      color: "text-muted-foreground",
      fondo: "bg-muted",
    },
    {
      id: "Pendiente",
      etiqueta: "Pendientes",
      valor: resumen.porEstado["Pendiente"],
      icono: Clock,
      color: ESTADO_CONFIG["Pendiente"].color,
      fondo: ESTADO_CONFIG["Pendiente"].fondoSuave,
    },
    {
      id: "En pláticas",
      etiqueta: "En pláticas",
      valor: resumen.porEstado["En pláticas"],
      icono: MessagesSquare,
      color: ESTADO_CONFIG["En pláticas"].color,
      fondo: ESTADO_CONFIG["En pláticas"].fondoSuave,
    },
    {
      id: "En avance",
      etiqueta: "En avance",
      valor: resumen.porEstado["En avance"],
      icono: TrendingUp,
      color: ESTADO_CONFIG["En avance"].color,
      fondo: ESTADO_CONFIG["En avance"].fondoSuave,
    },
    {
      id: "Cerrada - Ganada",
      etiqueta: "Cerradas con éxito",
      valor: resumen.porEstado["Cerrada - Ganada"],
      icono: CheckCircle2,
      color: ESTADO_CONFIG["Cerrada - Ganada"].color,
      fondo: ESTADO_CONFIG["Cerrada - Ganada"].fondoSuave,
    },
    {
      id: "marcadas",
      etiqueta: "Próximos seguimientos",
      valor: resumen.marcadasSeguimiento,
      icono: BellRing,
      color: "text-seguimiento",
      fondo: "bg-seguimiento/12",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {tarjetas.map((tarjeta) => {
        const activa = tarjetaActiva === tarjeta.id;
        return (
          <Card
            key={tarjeta.id}
            className={cn(
              "p-0 transition-shadow hover:shadow-card-hover",
              // Tarjeta seleccionada: borde e indicador en champagne.
              activa && "border-champagne bg-accent ring-1 ring-champagne",
            )}
          >
            <button
              type="button"
              onClick={() => onSeleccionar(tarjeta.id)}
              aria-pressed={activa}
              aria-label={`Filtrar por ${tarjeta.etiqueta}`}
              className="flex w-full cursor-pointer items-center gap-3 rounded-lg p-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <IconoTarjeta
                icono={tarjeta.icono}
                color={activa ? "text-champagne" : tarjeta.color}
                fondo={activa ? "bg-champagne/15" : tarjeta.fondo}
              />
              <ValorTarjeta
                valor={tarjeta.valor}
                etiqueta={tarjeta.etiqueta}
                cargando={cargando}
              />
            </button>
          </Card>
        );
      })}
    </div>
  );
}

function IconoTarjeta({
  icono: Icono,
  color,
  fondo,
}: {
  icono: typeof Building2;
  color: string;
  fondo: string;
}) {
  return (
    <div
      className={cn(
        "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
        fondo,
      )}
    >
      <Icono className={cn("h-5 w-5", color)} />
    </div>
  );
}

function ValorTarjeta({
  valor,
  etiqueta,
  cargando,
}: {
  valor: number;
  etiqueta: string;
  cargando?: boolean;
}) {
  return (
    <div className="min-w-0">
      {cargando ? (
        <Skeleton className="h-7 w-10" />
      ) : (
        <p className="text-2xl font-semibold leading-tight tracking-tight">
          {valor}
        </p>
      )}
      <p className="truncate text-xs text-muted-foreground">{etiqueta}</p>
    </div>
  );
}
