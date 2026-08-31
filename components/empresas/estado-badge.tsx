"use client";

import { cn } from "@/lib/utils";
import { ESTADO_CONFIG } from "@/lib/constants";
import { useFase2 } from "@/lib/hooks/use-fase2";
import type { EstadoEmpresa } from "@/lib/types";

interface EstadoBadgeProps {
  estado: EstadoEmpresa;
  className?: string;
}

/**
 * Etiqueta de color del estado de una empresa.
 * Usa la etiqueta y el color personalizados en Configuración cuando existen;
 * si no, conserva exactamente el estilo por defecto de la paleta.
 */
export function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const { estadosConfig } = useFase2();
  const r = estadosConfig[estado];
  const base = ESTADO_CONFIG[estado];

  if (!r || !r.personalizado) {
    return (
      <span
        className={cn(
          "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
          base.badge,
          className,
        )}
      >
        <span className={cn("h-1.5 w-1.5 rounded-full", base.dot)} />
        {r?.etiqueta ?? estado}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium text-foreground",
        className,
      )}
      style={{
        backgroundColor: `${r.color}1f`,
        borderColor: `${r.color}59`,
      }}
    >
      <span
        className="h-1.5 w-1.5 rounded-full"
        style={{ backgroundColor: r.color }}
      />
      {r.etiqueta}
    </span>
  );
}
