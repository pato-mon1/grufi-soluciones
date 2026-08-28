"use client";

import {
  ArrowLeftRight,
  CalendarCheck,
  Mail,
  Phone,
  StickyNote,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ACTIVIDAD_CONFIG } from "@/lib/constants";
import { formatearFechaHora } from "@/lib/date";
import type { Actividad } from "@/lib/types";

const ICONOS: Record<string, LucideIcon> = {
  Phone,
  Mail,
  Users,
  StickyNote,
  ArrowLeftRight,
  CalendarCheck,
};

interface HistorialActividadesProps {
  actividades: Actividad[];
}

/** Línea de tiempo del historial: de la más reciente a la más antigua. */
export function HistorialActividades({
  actividades,
}: HistorialActividadesProps) {
  if (actividades.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">
        Aún no hay actividades registradas.
      </p>
    );
  }

  const ordenadas = [...actividades].sort((a, b) =>
    b.fechaHora.localeCompare(a.fechaHora),
  );

  return (
    <ol className="relative space-y-4 pl-6">
      <span
        aria-hidden
        className="absolute left-[9px] top-1 h-[calc(100%-0.5rem)] w-px bg-border"
      />
      {ordenadas.map((act) => {
        const cfg = ACTIVIDAD_CONFIG[act.tipo];
        const Icono = ICONOS[cfg.icono] ?? StickyNote;
        return (
          <li key={act.id} className="relative">
            <span className="absolute -left-6 top-0.5 flex h-[19px] w-[19px] items-center justify-center rounded-full border bg-card">
              <Icono className={cn("h-3 w-3", cfg.tono)} />
            </span>
            <p className="text-sm font-medium text-foreground">{act.tipo}</p>
            <p className="text-xs text-muted-foreground">
              {formatearFechaHora(act.fechaHora)}
              {act.usuario && act.usuario !== "local" && ` · ${act.usuario}`}
            </p>
            {act.descripcion && (
              <p className="mt-1 whitespace-pre-wrap text-sm text-foreground/90">
                {act.descripcion}
              </p>
            )}
          </li>
        );
      })}
    </ol>
  );
}
