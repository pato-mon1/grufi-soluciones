import { Inbox, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  variante: "sin-datos" | "sin-resultados";
  onLimpiarFiltros?: () => void;
  onAgregar?: () => void;
}

export function EmptyState({
  variante,
  onLimpiarFiltros,
  onAgregar,
}: EmptyStateProps) {
  if (variante === "sin-resultados") {
    return (
      <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted">
          <SearchX className="h-6 w-6 text-muted-foreground" />
        </div>
        <div className="space-y-1">
          <p className="font-medium">No se encontraron empresas</p>
          <p className="text-sm text-muted-foreground">
            Prueba con otro término de búsqueda o ajusta los filtros.
          </p>
        </div>
        {onLimpiarFiltros && (
          <Button variant="outline" size="sm" onClick={onLimpiarFiltros}>
            Limpiar filtros
          </Button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 px-6 py-16 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-accent">
        <Inbox className="h-6 w-6 text-champagne" />
      </div>
      <div className="space-y-1">
        <p className="font-medium">Todavía no hay empresas</p>
        <p className="text-sm text-muted-foreground">
          Agrega tu primera empresa para comenzar a dar seguimiento.
        </p>
      </div>
      {onAgregar && (
        <Button size="sm" onClick={onAgregar}>
          Agregar empresa
        </Button>
      )}
    </div>
  );
}
