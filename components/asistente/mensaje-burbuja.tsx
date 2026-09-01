"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Copy,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TextoRico } from "@/components/asistente/texto-rico";
import { Fuentes } from "@/components/asistente/fuentes";
import type { MensajeChat } from "@/lib/asistente/tipos";

export function MensajeBurbuja({
  mensaje,
  onValorar,
}: {
  mensaje: MensajeChat;
  onValorar: (valor: 1 | -1) => void;
}) {
  const [copiado, setCopiado] = useState(false);
  const esUsuario = mensaje.role === "user";

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensaje.content);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      /* el navegador puede bloquear el portapapeles */
    }
  }

  if (esUsuario) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-3.5 py-2 text-sm text-primary-foreground">
          {mensaje.content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-2.5">
      <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-champagne">
        <Sparkles className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "rounded-2xl rounded-tl-sm border bg-card px-3.5 py-2.5 shadow-card",
            mensaje.error && "border-destructive/40 bg-destructive/5",
          )}
        >
          {mensaje.error && (
            <p className="mb-1 flex items-center gap-1.5 text-xs font-medium text-destructive">
              <AlertTriangle className="h-3.5 w-3.5" />
              No se pudo completar
            </p>
          )}

          {mensaje.content ? (
            <TextoRico texto={mensaje.content} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Consultando información…
            </p>
          )}

          {mensaje.streaming && mensaje.content && (
            <span className="ml-0.5 inline-block h-4 w-1.5 animate-pulse bg-champagne align-middle" />
          )}

          {!mensaje.streaming && mensaje.sources && mensaje.sources.length > 0 && (
            <Fuentes fuentes={mensaje.sources} />
          )}
        </div>

        {!mensaje.streaming && !mensaje.error && mensaje.content && (
          <div className="mt-1 flex items-center gap-0.5">
            <button
              type="button"
              onClick={copiar}
              title="Copiar respuesta"
              className="rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              {copiado ? (
                <Check className="h-3.5 w-3.5 text-exito" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
            </button>
            <button
              type="button"
              onClick={() => onValorar(1)}
              title="Respuesta útil"
              className={cn(
                "rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                mensaje.feedback === 1 && "text-exito",
              )}
            >
              <ThumbsUp className="h-3.5 w-3.5" />
            </button>
            <button
              type="button"
              onClick={() => onValorar(-1)}
              title="Respuesta no útil"
              className={cn(
                "rounded p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                mensaje.feedback === -1 && "text-destructive",
              )}
            >
              <ThumbsDown className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
