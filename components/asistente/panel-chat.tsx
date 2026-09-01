"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Send, Sparkles, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { usePermisos } from "@/lib/hooks/use-permisos";
import { MensajeBurbuja } from "@/components/asistente/mensaje-burbuja";
import type { EstadoAsistente } from "@/lib/hooks/use-asistente";

const SUGERENCIAS_BASE = [
  "Dame un resumen general de todos los proyectos.",
  "¿Qué tareas están atrasadas?",
  "¿Qué sigue esta semana?",
  "¿Quién tiene más pendientes?",
  "¿Qué empresas necesitan seguimiento?",
];
const SUGERENCIA_FINANZAS = "Dame el resumen financiero del mes.";
const MAX_LARGO = 2000;

export function PanelChat({
  asistente,
  modo = "pagina",
}: {
  asistente: EstadoAsistente;
  modo?: "pagina" | "flotante";
}) {
  const { puede } = usePermisos();
  const [texto, setTexto] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLTextAreaElement>(null);

  const {
    mensajes,
    enviando,
    progreso,
    iaConfigurada,
    cargandoMensajes,
    enviar,
    cancelar,
  } = asistente;

  const sugerencias = useMemo(() => {
    const lista = [...SUGERENCIAS_BASE];
    if (puede("finanzas", "view")) lista.push(SUGERENCIA_FINANZAS);
    return lista;
  }, [puede]);

  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes, progreso]);

  useEffect(() => {
    const el = areaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [texto]);

  function mandar(valor: string) {
    const limpio = valor.trim().slice(0, MAX_LARGO);
    if (!limpio || enviando) return;
    setTexto("");
    void enviar(limpio);
  }

  const vacia = mensajes.length === 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      {iaConfigurada === false && (
        <div className="m-3 rounded-md border border-alerta/40 bg-alerta/10 p-3 text-sm text-foreground">
          El Asistente GRUFI necesita configurar el proveedor de inteligencia
          artificial. Un administrador debe definir{" "}
          <code className="rounded bg-muted px-1">ANTHROPIC_API_KEY</code> (y
          opcionalmente <code className="rounded bg-muted px-1">AI_MODEL</code>)
          en el servidor y volver a desplegar.
        </div>
      )}

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-3 py-4 sm:px-4"
      >
        {vacia && !cargandoMensajes && (
          <div className="mx-auto max-w-lg py-6 text-center">
            <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-accent text-champagne">
              <Sparkles className="h-5 w-5" />
            </span>
            <h2 className="mt-3 text-base font-semibold text-foreground">
              Asistente GRUFI
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Consulta proyectos, tareas, seguimientos y resultados con
              información real y actualizada.
            </p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {sugerencias.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => mandar(s)}
                  className="rounded-full border bg-card px-3 py-1.5 text-xs text-foreground transition-colors hover:border-champagne hover:bg-accent/50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {cargandoMensajes && (
          <div className="flex justify-center py-6 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        )}

        {mensajes.map((m) => (
          <MensajeBurbuja
            key={m.id}
            mensaje={m}
            onValorar={(v) => void asistente.valorar(m.id, v)}
          />
        ))}

        {enviando && progreso && (
          <p className="flex items-center gap-2 pl-10 text-xs text-muted-foreground">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            {progreso === "consultando"
              ? "Consultando información…"
              : "Redactando respuesta…"}
          </p>
        )}
      </div>

      <div className="border-t bg-card p-3">
        <div className="flex items-end gap-2">
          <textarea
            ref={areaRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value.slice(0, MAX_LARGO))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                mandar(texto);
              }
            }}
            rows={1}
            placeholder="Escribe tu pregunta…"
            className="max-h-40 min-h-[40px] flex-1 resize-none rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:ring-offset-background"
          />
          {enviando ? (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={cancelar}
              title="Detener respuesta"
              className="h-10 w-10 shrink-0"
            >
              <Square className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              type="button"
              size="icon"
              onClick={() => mandar(texto)}
              disabled={!texto.trim()}
              title="Enviar"
              className="h-10 w-10 shrink-0"
            >
              <Send className="h-4 w-4" />
            </Button>
          )}
        </div>
        <div className="mt-1 flex items-center justify-between px-1">
          <p className="text-[11px] text-muted-foreground">
            {modo === "pagina"
              ? "Solo consulta · no modifica registros"
              : "Solo consulta"}
          </p>
          {texto.length > MAX_LARGO - 200 && (
            <p className="text-[11px] text-muted-foreground">
              {texto.length}/{MAX_LARGO}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
