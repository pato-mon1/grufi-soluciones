"use client";

import { useState } from "react";
import { Archive, ArchiveRestore, Pencil, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type {
  CategoriaFinanza,
  CategoriaFinanzaInput,
  TipoMovimiento,
} from "@/lib/types";

const COLORES = [
  "#B89B5E",
  "#3F7D62",
  "#9B4F55",
  "#5C7C8A",
  "#C58C36",
  "#64748B",
  "#7C3AED",
  "#2563EB",
];

function ListaCategorias({
  items,
  procesando,
  editId,
  editNombre,
  onEditNombre,
  onIniciarEdicion,
  onCancelarEdicion,
  onActualizar,
  onEliminar,
}: {
  items: CategoriaFinanza[];
  procesando: boolean;
  editId: string | null;
  editNombre: string;
  onEditNombre: (valor: string) => void;
  onIniciarEdicion: (c: CategoriaFinanza) => void;
  onCancelarEdicion: () => void;
  onActualizar: (
    id: string,
    cambios: Partial<CategoriaFinanzaInput>,
  ) => Promise<unknown>;
  onEliminar: (id: string) => Promise<void>;
}) {
  if (items.length === 0) {
    return (
      <p className="px-1 py-2 text-xs text-muted-foreground">Sin categorías.</p>
    );
  }
  return (
    <ul className="space-y-1">
      {items.map((c) => (
        <li
          key={c.id}
          className={cn(
            "flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm",
            c.archivada && "opacity-60",
          )}
        >
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: c.color }}
          />
          {editId === c.id ? (
            <>
              <Input
                value={editNombre}
                onChange={(e) => onEditNombre(e.target.value)}
                className="h-7 flex-1"
                autoFocus
              />
              <Button
                size="sm"
                className="h-7"
                disabled={procesando || !editNombre.trim()}
                onClick={async () => {
                  await onActualizar(c.id, { nombre: editNombre.trim() });
                  onCancelarEdicion();
                }}
              >
                Guardar
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                onClick={onCancelarEdicion}
                aria-label="Cancelar"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            </>
          ) : (
            <>
              <span className="flex-1 truncate">
                {c.nombre}
                {c.archivada && (
                  <span className="ml-1 text-xs text-muted-foreground">
                    (archivada)
                  </span>
                )}
              </span>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label="Renombrar categoría"
                onClick={() => onIniciarEdicion(c)}
              >
                <Pencil className="h-3.5 w-3.5" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7"
                aria-label={c.archivada ? "Restaurar" : "Archivar"}
                disabled={procesando}
                onClick={() =>
                  void onActualizar(c.id, { archivada: !c.archivada })
                }
              >
                {c.archivada ? (
                  <ArchiveRestore className="h-3.5 w-3.5" />
                ) : (
                  <Archive className="h-3.5 w-3.5" />
                )}
              </Button>
              <Button
                size="icon"
                variant="ghost"
                className="h-7 w-7 text-destructive hover:text-destructive"
                aria-label="Eliminar categoría"
                disabled={procesando}
                onClick={() => void onEliminar(c.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </>
          )}
        </li>
      ))}
    </ul>
  );
}

export function CategoriasDialog({
  abierto,
  categorias,
  procesando,
  onOpenChange,
  onCrear,
  onActualizar,
  onEliminar,
}: {
  abierto: boolean;
  categorias: CategoriaFinanza[];
  procesando: boolean;
  onOpenChange: (abierto: boolean) => void;
  onCrear: (input: CategoriaFinanzaInput) => Promise<unknown>;
  onActualizar: (
    id: string,
    cambios: Partial<CategoriaFinanzaInput>,
  ) => Promise<unknown>;
  onEliminar: (id: string) => Promise<void>;
}) {
  const [nombre, setNombre] = useState("");
  const [tipo, setTipo] = useState<TipoMovimiento>("ingreso");
  const [color, setColor] = useState(COLORES[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editNombre, setEditNombre] = useState("");

  const ingresos = categorias.filter((c) => c.tipo === "ingreso");
  const egresos = categorias.filter((c) => c.tipo === "egreso");

  async function agregar() {
    if (!nombre.trim()) return;
    await onCrear({ nombre: nombre.trim(), tipo, color, archivada: false });
    setNombre("");
  }

  const propsLista = {
    procesando,
    editId,
    editNombre,
    onEditNombre: setEditNombre,
    onIniciarEdicion: (c: CategoriaFinanza) => {
      setEditId(c.id);
      setEditNombre(c.nombre);
    },
    onCancelarEdicion: () => setEditId(null),
    onActualizar,
    onEliminar,
  };

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Categorías de finanzas</DialogTitle>
          <DialogDescription>
            Al eliminar una categoría, sus movimientos se conservan y quedan
            como “Sin categoría”. Archivar la oculta de los formularios sin
            borrar su historial.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-end gap-2 rounded-md border bg-muted/40 p-3">
          <div className="flex-1 space-y-1">
            <label htmlFor="cat-nombre" className="text-xs font-medium">
              Nueva categoría
            </label>
            <Input
              id="cat-nombre"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Nombre"
              className="h-8"
            />
          </div>
          <Select
            value={tipo}
            onValueChange={(v) => setTipo(v as TipoMovimiento)}
          >
            <SelectTrigger className="h-8 w-28" aria-label="Tipo de categoría">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ingreso">Ingreso</SelectItem>
              <SelectItem value="egreso">Egreso</SelectItem>
            </SelectContent>
          </Select>
          <div className="flex items-center gap-1">
            {COLORES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Color ${c}`}
                onClick={() => setColor(c)}
                className={cn(
                  "h-6 w-6 rounded-full border-2",
                  color === c ? "border-foreground" : "border-transparent",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <Button
            size="sm"
            className="h-8"
            disabled={procesando || !nombre.trim()}
            onClick={agregar}
          >
            <Plus className="h-4 w-4" />
            Agregar
          </Button>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Ingresos
            </h4>
            <ListaCategorias items={ingresos} {...propsLista} />
          </div>
          <div>
            <h4 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Egresos
            </h4>
            <ListaCategorias items={egresos} {...propsLista} />
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
