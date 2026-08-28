"use client";

import { CloudUpload, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface MigrarSupabaseDialogProps {
  cantidad: number;
  procesando: boolean;
  onImportar: () => void;
  onContinuarLocal: () => void;
}

export function MigrarSupabaseDialog({
  cantidad,
  procesando,
  onImportar,
  onContinuarLocal,
}: MigrarSupabaseDialogProps) {
  return (
    <Dialog open={cantidad > 0}>
      <DialogContent
        className="max-w-md"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-estado-avance/12">
            <CloudUpload className="h-5 w-5 text-estado-avance" />
          </div>
          <DialogTitle>Datos locales encontrados</DialogTitle>
          <DialogDescription>
            Encontramos {cantidad} empresa{cantidad === 1 ? "" : "s"} guardada
            {cantidad === 1 ? "" : "s"} localmente. ¿Deseas importarla
            {cantidad === 1 ? "" : "s"} a Supabase? (También se migran sus
            contactos y su historial. No se eliminan los datos locales.)
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            variant="outline"
            onClick={onContinuarLocal}
            disabled={procesando}
          >
            Continuar en modo local
          </Button>
          <Button onClick={onImportar} disabled={procesando}>
            {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
            Importar a Supabase
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
