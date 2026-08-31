"use client";

import { cn } from "@/lib/utils";
import { ESTADO_CONFIG } from "@/lib/constants";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { clavesOrdenadas } from "@/lib/estados";
import { type EstadoEmpresa } from "@/lib/types";
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
  const { estadosConfig } = useFase2();
  const claves = clavesOrdenadas(estadosConfig);
  const actual = estadosConfig[estado];

  const punto = (clave: EstadoEmpresa) => {
    const r = estadosConfig[clave];
    return r?.personalizado ? (
      <span
        className="h-1.5 w-1.5 shrink-0 rounded-full"
        style={{ backgroundColor: r.color }}
      />
    ) : (
      <span
        className={cn(
          "h-1.5 w-1.5 shrink-0 rounded-full",
          ESTADO_CONFIG[clave].dot,
        )}
      />
    );
  };

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
          {punto(estado)}
          <SelectValue>{actual?.etiqueta ?? estado}</SelectValue>
        </span>
      </SelectTrigger>
      <SelectContent>
        {claves.map((clave) => (
          <SelectItem
            key={clave}
            value={clave}
            className={cn(
              "text-xs",
              clave === estado &&
                !estadosConfig[clave]?.personalizado &&
                ESTADO_CONFIG[clave].fondoSuave,
            )}
          >
            <span className="flex items-center gap-2">
              {punto(clave)}
              {estadosConfig[clave]?.etiqueta ?? clave}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
