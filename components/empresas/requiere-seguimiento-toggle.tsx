"use client";

import { Bell, BellRing } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Empresa } from "@/lib/types";

interface RequiereSeguimientoToggleProps {
  empresa: Empresa;
  onToggle: (id: string, valor: boolean) => void | Promise<void>;
  /** "tabla" = compacto para una celda; "completo" = botón ancho (celular). */
  variante?: "tabla" | "completo";
}

/**
 * Interruptor rápido de la marca manual "Próximo seguimiento".
 * Es independiente de la fecha de próximo seguimiento.
 */
export function RequiereSeguimientoToggle({
  empresa,
  onToggle,
  variante = "tabla",
}: RequiereSeguimientoToggleProps) {
  const marcada = empresa.requiereSeguimiento;

  const handleClick = () => void onToggle(empresa.id, !marcada);
  const etiquetaAria = marcada
    ? `Quitar la marca de próximo seguimiento de ${empresa.nombre}`
    : `Marcar ${empresa.nombre} como próximo seguimiento`;

  if (variante === "completo") {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed={marcada}
        aria-label={etiquetaAria}
        className={cn(
          "flex w-full items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium transition-colors",
          marcada
            ? "border-seguimiento/35 bg-seguimiento/10 text-seguimiento"
            : "border-input text-muted-foreground hover:bg-accent hover:text-foreground",
        )}
      >
        {marcada ? (
          <BellRing className="h-4 w-4 shrink-0 fill-seguimiento/20" />
        ) : (
          <Bell className="h-4 w-4 shrink-0" />
        )}
        {marcada ? "Próximo seguimiento" : "Marcar para próximo seguimiento"}
      </button>
    );
  }

  if (marcada) {
    return (
      <button
        type="button"
        onClick={handleClick}
        aria-pressed
        aria-label={etiquetaAria}
        className="inline-flex items-center gap-1.5 rounded-full bg-seguimiento/12 px-2 py-1 text-seguimiento transition-colors hover:bg-seguimiento/18"
      >
        <BellRing className="h-3.5 w-3.5 fill-seguimiento/20" />
        <span className="whitespace-nowrap text-xs font-medium">
          Próximo seguimiento
        </span>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-pressed={false}
      aria-label={etiquetaAria}
      className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/50 transition-colors hover:bg-accent hover:text-foreground"
    >
      <Bell className="h-4 w-4" />
    </button>
  );
}
