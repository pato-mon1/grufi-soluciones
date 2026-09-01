"use client";

import { useRouter } from "next/navigation";
import { Bell, CheckCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { useNotificaciones } from "@/lib/hooks/use-notificaciones";
import { formatearFechaHora } from "@/lib/date";
import type { Notificacion } from "@/lib/types";

function tiempoRelativo(iso: string): string {
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.round(d / 60000);
  if (m < 1) return "ahora";
  if (m < 60) return `hace ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `hace ${h} h`;
  const dias = Math.round(h / 24);
  if (dias < 7) return `hace ${dias} d`;
  return formatearFechaHora(iso);
}

export function CampanaNotificaciones() {
  const router = useRouter();
  const { notificaciones, noLeidas, marcarLeida, marcarTodas } =
    useNotificaciones();

  function abrir(n: Notificacion) {
    void marcarLeida(n.id);
    if (n.tareaId) router.push(`/tareas?tarea=${n.tareaId}`);
  }

  const recientes = notificaciones.slice(0, 12);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Notificaciones${noLeidas ? ` (${noLeidas} sin leer)` : ""}`}
          className="relative rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="h-5 w-5" />
          {noLeidas > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-estado-perdida px-1 text-[10px] font-semibold text-white">
              {noLeidas > 9 ? "9+" : noLeidas}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-3 py-2">
          <span className="text-sm font-semibold">Notificaciones</span>
          {noLeidas > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 gap-1 px-2 text-xs"
              onClick={() => void marcarTodas()}
            >
              <CheckCheck className="h-3.5 w-3.5" />
              Marcar todas
            </Button>
          )}
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {recientes.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">
              Sin notificaciones.
            </p>
          ) : (
            <ul className="divide-y">
              {recientes.map((n) => (
                <li key={n.id}>
                  <button
                    type="button"
                    onClick={() => abrir(n)}
                    className={cn(
                      "flex w-full flex-col gap-0.5 px-3 py-2 text-left text-sm transition-colors hover:bg-accent/40",
                      !n.leidaEn && "bg-accent/30",
                    )}
                  >
                    <span className="flex items-start gap-2">
                      {!n.leidaEn && (
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-estado-avance" />
                      )}
                      <span className="min-w-0 flex-1 font-medium leading-snug">
                        {n.titulo}
                      </span>
                    </span>
                    {n.mensaje && (
                      <span className="ml-3.5 line-clamp-2 text-xs text-muted-foreground">
                        {n.mensaje}
                      </span>
                    )}
                    <span className="ml-3.5 text-[11px] text-muted-foreground">
                      {tiempoRelativo(n.fechaCreacion)}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
