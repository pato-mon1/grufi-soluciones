import { cn } from "@/lib/utils";
import { ESTADO_CONFIG } from "@/lib/constants";
import type { EstadoEmpresa } from "@/lib/types";

interface EstadoBadgeProps {
  estado: EstadoEmpresa;
  className?: string;
}

/** Etiqueta de color que representa el estado de una empresa. */
export function EstadoBadge({ estado, className }: EstadoBadgeProps) {
  const config = ESTADO_CONFIG[estado];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium",
        config.badge,
        className,
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", config.dot)} />
      {estado}
    </span>
  );
}
