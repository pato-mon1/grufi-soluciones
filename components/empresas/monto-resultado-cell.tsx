"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatearMonto, montoATextoEntrada, parsearMonto } from "@/lib/money";
import type { Empresa } from "@/lib/types";

interface MontoResultadoCellProps {
  empresa: Empresa;
  onGuardar: (id: string, monto: number | null) => void | Promise<void>;
  /** Ocupa todo el ancho disponible (vista de celular). */
  ancho?: boolean;
}

/**
 * Celda de "Resultado" con edición rápida del monto en MXN.
 * - Un clic abre un campo para capturar o modificar la cantidad.
 * - En modo edición aparece "Quitar monto", que guarda `null` (no `0`).
 * - Guardar el campo vacío también deja el monto en `null`.
 * - Escribir `0` guarda `$0 MXN` (sigue siendo un valor válido).
 */
export function MontoResultadoCell({
  empresa,
  onGuardar,
  ancho,
}: MontoResultadoCellProps) {
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(() =>
    montoATextoEntrada(empresa.montoResultado),
  );
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const tieneMonto = empresa.montoResultado !== null;

  useEffect(() => {
    if (editando) {
      setTexto(montoATextoEntrada(empresa.montoResultado));
      setError(false);
      // Enfoca al entrar en modo edición.
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editando, empresa.montoResultado]);

  function confirmar() {
    const parseado = parsearMonto(texto);
    if (!parseado.valido) {
      setError(true);
      inputRef.current?.focus();
      return;
    }
    setEditando(false);
    // `parsearMonto` devuelve `null` cuando el texto queda vacío: se guarda vacío.
    if (parseado.monto !== empresa.montoResultado) {
      void onGuardar(empresa.id, parseado.monto);
    }
  }

  function cancelar() {
    setEditando(false);
    setError(false);
    setTexto(montoATextoEntrada(empresa.montoResultado));
  }

  /** "Quitar monto": guarda `null` sin importar lo que haya en el campo. */
  function quitar() {
    setEditando(false);
    setError(false);
    if (empresa.montoResultado !== null) {
      void onGuardar(empresa.id, null);
    }
  }

  // Al perder el foco: guarda si es válido, revierte si no (sin atrapar al usuario).
  function alPerderFoco() {
    if (parsearMonto(texto).valido) confirmar();
    else cancelar();
  }

  if (editando) {
    return (
      <div className={cn("flex flex-col gap-1", ancho && "w-full")}>
        <div className="flex items-center gap-1">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
              $
            </span>
            <input
              ref={inputRef}
              type="text"
              inputMode="decimal"
              value={texto}
              onChange={(e) => {
                setTexto(e.target.value);
                setError(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  confirmar();
                } else if (e.key === "Escape") {
                  e.preventDefault();
                  cancelar();
                }
              }}
              onBlur={alPerderFoco}
              placeholder="Vacío = sin monto"
              aria-label={`Monto del resultado de ${empresa.nombre} en pesos`}
              aria-invalid={error}
              className={cn(
                "h-8 w-full rounded-md border bg-card pl-5 pr-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                error ? "border-destructive" : "border-input",
              )}
            />
          </div>
          <button
            type="button"
            // onMouseDown evita que el blur del input cancele el clic.
            onMouseDown={(e) => e.preventDefault()}
            onClick={confirmar}
            className="flex h-8 w-8 items-center justify-center rounded-md text-exito hover:bg-exito/10"
            aria-label="Guardar monto"
          >
            <Check className="h-4 w-4" />
          </button>
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={cancelar}
            className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
            aria-label="Cancelar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {tieneMonto && (
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={quitar}
            className="inline-flex w-fit items-center gap-1 rounded px-1 py-0.5 text-xs font-medium text-destructive transition-colors hover:bg-destructive/10"
          >
            <Trash2 className="h-3 w-3" />
            Quitar monto
          </button>
        )}

        {error && (
          <span className="text-xs font-medium text-destructive">
            Escribe un número (0 o más) o usa “Quitar monto”.
          </span>
        )}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setEditando(true)}
      className={cn(
        "group inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-left text-sm transition-colors hover:bg-accent",
        ancho && "w-full",
        tieneMonto ? "font-medium text-foreground" : "text-muted-foreground",
      )}
      aria-label={
        tieneMonto
          ? `Modificar el monto del resultado de ${empresa.nombre}`
          : `Capturar el monto del resultado de ${empresa.nombre}`
      }
    >
      {tieneMonto ? formatearMonto(empresa.montoResultado) : "Agregar monto"}
      <Pencil className="h-3 w-3 text-champagne opacity-0 transition-opacity group-hover:opacity-80" />
    </button>
  );
}
