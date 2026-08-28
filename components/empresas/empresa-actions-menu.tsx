"use client";

import { CalendarCheck, Eye, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Empresa } from "@/lib/types";

interface EmpresaActionsMenuProps {
  empresa: Empresa;
  onVerDetalle: (empresa: Empresa) => void;
  onEditar: (empresa: Empresa) => void;
  onMarcarSeguimiento: (empresa: Empresa) => void;
  onEliminar: (empresa: Empresa) => void;
}

export function EmpresaActionsMenu({
  empresa,
  onVerDetalle,
  onEditar,
  onMarcarSeguimiento,
  onEliminar,
}: EmpresaActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-muted-foreground"
          aria-label={`Acciones para ${empresa.nombre}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onVerDetalle(empresa)}>
          <Eye className="h-4 w-4" />
          Ver detalle
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEditar(empresa)}>
          <Pencil className="h-4 w-4" />
          Editar
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onMarcarSeguimiento(empresa)}>
          <CalendarCheck className="h-4 w-4" />
          Marcar seguimiento
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => onEliminar(empresa)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="h-4 w-4" />
          Eliminar
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
