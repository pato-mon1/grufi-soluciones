"use client";

import { cn } from "@/lib/utils";
import { ESTADO_CONFIG } from "@/lib/constants";
import { ESTADOS, type EstadoEmpresa } from "@/lib/types";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface EstadoQuickSelectProps {
  estado: EstadoEmpresa;
  onChange: (estado: EstadoEmpresa) => void;
  disabled?: boolean;
  className?: string;
}

/** Selector compacto para cambiar el estado directamente desde la tabla. */
export function EstadoQuickSelect({
  estado,
  onChange,
  disabled,
  className,
}: EstadoQuickSelectProps) {
  return (
    <Select
      value={estado}
      onValueChange={(valor) => onChange(valor as EstadoEmpresa)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          "h-8 w-[190px] border-dashed bg-transparent text-xs font-medium shadow-none focus:ring-1",
          className,
        )}
        aria-label="Cambiar estado"
      >
        <span className="flex items-center gap-1.5">
          <span
            className={cn(
              "h-1.5 w-1.5 shrink-0 rounded-full",
              ESTADO_CONFIG[estado].dot,
            )}
          />
          <SelectValue />
        </span>
      </SelectTrigger>
      <SelectContent>
        {ESTADOS.map((opcion) => (
          <SelectItem
            key={opcion}
            value={opcion}
            className={cn(
              "text-xs",
              // Opción seleccionada: su fondo suave correspondiente.
              opcion === estado && ESTADO_CONFIG[opcion].fondoSuave,
            )}
          >
            <span className="flex items-center gap-2">
              <span
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  ESTADO_CONFIG[opcion].dot,
                )}
              />
              {opcion}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
