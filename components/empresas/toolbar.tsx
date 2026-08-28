"use client";

import { useRef } from "react";
import {
  ArrowDownAZ,
  ArrowUpAZ,
  Bell,
  BellRing,
  Download,
  Search,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectSeparator,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ESTADO_CONFIG, OPCIONES_ORDEN } from "@/lib/constants";
import { ESTADOS } from "@/lib/types";
import type { OpcionesFiltro } from "@/lib/filtros";

interface ToolbarProps {
  opciones: OpcionesFiltro;
  onOpcionesChange: (opciones: OpcionesFiltro) => void;
  onImportar: (archivo: File) => void;
  onExportar: () => void;
  pendientesSeguimiento: number;
  marcadasSeguimiento: number;
  deshabilitado?: boolean;
}

export function Toolbar({
  opciones,
  onOpcionesChange,
  onImportar,
  onExportar,
  pendientesSeguimiento,
  marcadasSeguimiento,
  deshabilitado,
}: ToolbarProps) {
  const inputArchivo = useRef<HTMLInputElement>(null);

  function actualizar(cambios: Partial<OpcionesFiltro>) {
    onOpcionesChange({ ...opciones, ...cambios });
  }

  function manejarArchivo(evento: React.ChangeEvent<HTMLInputElement>) {
    const archivo = evento.target.files?.[0];
    if (archivo) onImportar(archivo);
    evento.target.value = "";
  }

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      {/* Búsqueda */}
      <div className="relative w-full lg:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={opciones.busqueda}
          onChange={(e) => actualizar({ busqueda: e.target.value })}
          placeholder="Buscar empresa por nombre..."
          className="pl-9 pr-9"
          aria-label="Buscar empresa por nombre"
        />
        {opciones.busqueda && (
          <button
            type="button"
            onClick={() => actualizar({ busqueda: "" })}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
            aria-label="Limpiar búsqueda"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {/* Filtro por estado */}
        <Select
          value={opciones.estado}
          onValueChange={(valor) =>
            actualizar({ estado: valor as OpcionesFiltro["estado"] })
          }
        >
          <SelectTrigger className="h-9 w-[170px]" aria-label="Filtrar por estado">
            <SelectValue placeholder="Estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todos los estados</SelectItem>
            <SelectSeparator />
            {ESTADOS.map((opcion) => (
              <SelectItem
                key={opcion}
                value={opcion}
                className={cn(
                  opciones.estado === opcion &&
                    ESTADO_CONFIG[opcion].fondoSuave,
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

        {/* Ordenar */}
        <div className="flex items-center">
          <Select
            value={opciones.orden}
            onValueChange={(valor) =>
              actualizar({ orden: valor as OpcionesFiltro["orden"] })
            }
          >
            <SelectTrigger
              className="h-9 w-[190px] rounded-r-none"
              aria-label="Ordenar por"
            >
              <SelectValue placeholder="Ordenar por" />
            </SelectTrigger>
            <SelectContent>
              {OPCIONES_ORDEN.map((opcion) => (
                <SelectItem key={opcion.valor} value={opcion.valor}>
                  {opcion.etiqueta}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="h-9 w-9 rounded-l-none border-l-0"
            onClick={() =>
              actualizar({
                direccion: opciones.direccion === "asc" ? "desc" : "asc",
              })
            }
            aria-label={
              opciones.direccion === "asc"
                ? "Orden ascendente"
                : "Orden descendente"
            }
          >
            {opciones.direccion === "asc" ? (
              <ArrowDownAZ className="h-4 w-4" />
            ) : (
              <ArrowUpAZ className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Filtro: marca manual "Próximo seguimiento" */}
        <Button
          type="button"
          variant={opciones.soloMarcadas ? "default" : "outline"}
          className={cn("h-9", opciones.soloMarcadas && "shadow-sm")}
          onClick={() => actualizar({ soloMarcadas: !opciones.soloMarcadas })}
          aria-pressed={opciones.soloMarcadas}
        >
          <BellRing className="h-4 w-4" />
          Próximos seguimientos
          <span
            className={cn(
              "ml-0.5 rounded-full px-1.5 text-xs font-semibold",
              opciones.soloMarcadas
                ? "bg-primary-foreground/20 text-primary-foreground"
                : "bg-primary/10 text-primary",
            )}
          >
            {marcadasSeguimiento}
          </span>
        </Button>

        {/* Filtro: seguimiento vencido según la fecha */}
        <Button
          type="button"
          variant={opciones.soloPendientes ? "default" : "outline"}
          className={cn("h-9", opciones.soloPendientes && "shadow-sm")}
          onClick={() =>
            actualizar({ soloPendientes: !opciones.soloPendientes })
          }
          aria-pressed={opciones.soloPendientes}
        >
          <Bell className="h-4 w-4" />
          Fecha vencida
          {pendientesSeguimiento > 0 && (
            <span
              className={cn(
                "ml-0.5 rounded-full px-1.5 text-xs font-semibold",
                opciones.soloPendientes
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-primary/10 text-primary",
              )}
            >
              {pendientesSeguimiento}
            </span>
          )}
        </Button>

        {/* Importar / Exportar */}
        <input
          ref={inputArchivo}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={manejarArchivo}
        />
        <Button
          type="button"
          variant="outline"
          className="h-9"
          onClick={() => inputArchivo.current?.click()}
          disabled={deshabilitado}
        >
          <Upload className="h-4 w-4" />
          Importar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="h-9"
          onClick={onExportar}
          disabled={deshabilitado}
        >
          <Download className="h-4 w-4" />
          Exportar
        </Button>
      </div>
    </div>
  );
}
