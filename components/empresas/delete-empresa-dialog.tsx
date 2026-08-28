"use client";

import { useState } from "react";
import { Loader2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Empresa } from "@/lib/types";

interface DeleteEmpresaDialogProps {
  empresa: Empresa | null;
  onOpenChange: (abierto: boolean) => void;
  onConfirmar: (id: string) => Promise<void>;
}

export function DeleteEmpresaDialog({
  empresa,
  onOpenChange,
  onConfirmar,
}: DeleteEmpresaDialogProps) {
  const [eliminando, setEliminando] = useState(false);

  async function confirmar() {
    if (!empresa) return;
    setEliminando(true);
    try {
      await onConfirmar(empresa.id);
      onOpenChange(false);
    } finally {
      setEliminando(false);
    }
  }

  return (
    <Dialog
      open={empresa !== null}
      onOpenChange={(v) => !eliminando && onOpenChange(v)}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
            <TriangleAlert className="h-5 w-5 text-destructive" />
          </div>
          <DialogTitle>Eliminar empresa</DialogTitle>
          <DialogDescription>
            ¿Seguro que quieres eliminar{" "}
            <span className="font-medium text-foreground">
              {empresa?.nombre}
            </span>
            ? Esta acción no se puede deshacer y se perderá todo su historial.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={eliminando}
          >
            Cancelar
          </Button>
          <Button
            variant="destructive"
            onClick={confirmar}
            disabled={eliminando}
          >
            {eliminando && <Loader2 className="h-4 w-4 animate-spin" />}
            Eliminar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
