"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, CalendarDays, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { diasParaSeguimiento, formatearFecha, hoyISO } from "@/lib/date";
import { ESTADO_CONFIG } from "@/lib/constants";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Empresa } from "@/lib/types";

interface ProximoSeguimientoCellProps {
  empresa: Empresa;
  /** Si se define, la celda permite editar la fecha con un calendario. */
  onGuardar?: (id: string, fecha: string | null) => void | Promise<void>;
  /**
   * Se llama al completar un seguimiento desde el checkmark verde.
   * `nuevaFecha === null` = se finaliza sin agendar otra fecha.
   */
  onCompletar?: (id: string, nuevaFecha: string | null) => void | Promise<void>;
  /** Ocupa todo el ancho disponible (vista de celular). */
  ancho?: boolean;
}

/**
 * Celda de "Próximo seguimiento".
 * - Muestra la fecha con su indicador de urgencia (Atrasado / Hoy / En N d).
 * - Al hacer clic en la fecha (o el guion) abre el calendario nativo.
 * - Con fecha: un checkmark verde abre el diálogo para completar el seguimiento
 *   y agendar (o no) la siguiente fecha.
 *
 * Las fechas se manejan siempre como cadenas `YYYY-MM-DD` (fecha de calendario),
 * por lo que no hay desfases de zona horaria. Nunca se toca la marca/alerta
 * independiente `requiereSeguimiento`.
 */
export function ProximoSeguimientoCell({
  empresa,
  onGuardar,
  onCompletar,
  ancho,
}: ProximoSeguimientoCellProps) {
  const valor = empresa.fechaProximoSeguimiento;
  const [dialogoAbierto, setDialogoAbierto] = useState(false);
  const [nuevaFecha, setNuevaFecha] = useState("");

  useEffect(() => {
    if (dialogoAbierto) setNuevaFecha("");
  }, [dialogoAbierto]);

  const dias = diasParaSeguimiento(valor);
  const cerrada = ESTADO_CONFIG[empresa.estado].cerrado;

  let etiqueta: string | null = null;
  let tono = "text-muted-foreground";
  if (valor && !cerrada && dias !== null) {
    if (dias < 0) {
      etiqueta = `Atrasado ${Math.abs(dias)} d`;
      tono = "text-destructive"; // fecha vencida
    } else if (dias === 0) {
      etiqueta = "Hoy";
      tono = "text-alerta"; // fecha próxima / alerta preventiva
    } else if (dias <= 3) {
      etiqueta = `En ${dias} d`;
      tono = "text-alerta";
    } else {
      etiqueta = `En ${dias} d`;
      tono = "text-muted-foreground";
    }
  }

  const textoFecha = valor ? formatearFecha(valor) : "—";

  // Modo solo lectura (sin handler): filas del estado de carga.
  if (!onGuardar) {
    return (
      <div className="flex flex-col">
        <span className={cn("text-sm", !valor && "text-muted-foreground")}>
          {textoFecha}
        </span>
        {etiqueta && (
          <span className={cn("text-xs font-medium", tono)}>{etiqueta}</span>
        )}
      </div>
    );
  }

  /** Completa el seguimiento: quita la fecha anterior y guarda `fecha` (o vacío). */
  function completar(fecha: string | null) {
    setDialogoAbierto(false);
    void (onCompletar ?? onGuardar)?.(empresa.id, fecha);
  }

  return (
    <div className={cn("flex flex-col", ancho && "w-full")}>
      <div className="flex items-center gap-1">
        <div className="group/seg relative">
          <span
            className={cn(
              "inline-flex items-center gap-1.5 whitespace-nowrap rounded-md px-2 py-1 text-sm transition-colors group-hover/seg:bg-accent",
              valor ? "text-foreground" : "text-muted-foreground",
            )}
          >
            {textoFecha}
            <CalendarDays className="h-3 w-3 text-seguimiento opacity-70" />
          </span>
          <input
            type="date"
            value={valor ?? ""}
            onChange={(e) =>
              void onGuardar?.(empresa.id, e.target.value || null)
            }
            onClick={(e) => {
              const el = e.currentTarget;
              if (typeof el.showPicker === "function") {
                try {
                  el.showPicker();
                } catch {
                  /* Sin activación de usuario: el clic nativo abre el calendario. */
                }
              }
            }}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
            aria-label={
              valor
                ? `Cambiar la fecha de próximo seguimiento de ${empresa.nombre}`
                : `Programar el próximo seguimiento de ${empresa.nombre}`
            }
          />
        </div>
        {valor && (
          <button
            type="button"
            onClick={() => setDialogoAbierto(true)}
            title="Marcar seguimiento como completado"
            aria-label={`Marcar seguimiento como completado de ${empresa.nombre}`}
            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-exito transition-colors hover:bg-exito/10"
          >
            <Check className="h-4 w-4" />
          </button>
        )}
      </div>
      {etiqueta && (
        <span className={cn("px-2 text-xs font-medium", tono)}>{etiqueta}</span>
      )}

      <Dialog open={dialogoAbierto} onOpenChange={setDialogoAbierto}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-exito/12">
              <CalendarCheck className="h-5 w-5 text-exito" />
            </div>
            <DialogTitle>Seguimiento completado</DialogTitle>
            <DialogDescription>
              ¿Deseas agendar otro seguimiento?
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-1.5">
            <label
              htmlFor={`nueva-fecha-${empresa.id}`}
              className="text-sm font-medium"
            >
              Nueva fecha de próximo seguimiento
            </label>
            <input
              id={`nueva-fecha-${empresa.id}`}
              type="date"
              value={nuevaFecha}
              min={hoyISO()}
              onChange={(e) => setNuevaFecha(e.target.value)}
              className="flex h-9 w-full rounded-md border border-input bg-card px-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
          </div>

          <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              onClick={() => setDialogoAbierto(false)}
            >
              Cancelar
            </Button>
            <Button variant="secondary" onClick={() => completar(null)}>
              Finalizar sin nueva fecha
            </Button>
            <Button onClick={() => completar(nuevaFecha)} disabled={!nuevaFecha}>
              Agendar nueva fecha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
