"use client";

import { Cloud, HardDrive, LogOut, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AppHeaderProps {
  esSupabase: boolean;
  usuario: string | null;
  onAgregar: () => void;
  onCerrarSesion: () => void;
}

export function AppHeader({
  esSupabase,
  usuario,
  onAgregar,
  onCerrarSesion,
}: AppHeaderProps) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
            GRUFI SOLUCIONES
          </h1>
          <span className="inline-flex items-center gap-1 rounded-full border bg-card px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
            {esSupabase ? (
              <>
                <Cloud className="h-3 w-3 text-estado-avance" />
                Nube
              </>
            ) : (
              <>
                <HardDrive className="h-3 w-3" />
                Local
              </>
            )}
          </span>
          {esSupabase && usuario && (
            <span className="inline-flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hidden sm:inline">{usuario}</span>
              <button
                type="button"
                onClick={onCerrarSesion}
                className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs text-foreground hover:bg-accent"
              >
                <LogOut className="h-3 w-3" />
                Cerrar sesión
              </button>
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground">
          Administra y consulta el avance de cada oportunidad
        </p>
      </div>

      <Button onClick={onAgregar} className="w-full sm:w-auto">
        <Plus className="h-4 w-4 text-champagne" />
        Agregar empresa
      </Button>
    </header>
  );
}
