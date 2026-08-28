"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/empresas/field";
import { formatearFecha, hoyISO } from "@/lib/date";
import type { Empresa } from "@/lib/types";

interface SeguimientoDialogProps {
  empresa: Empresa | null;
  onOpenChange: (abierto: boolean) => void;
  onConfirmar: (
    id: string,
    datos: { fechaProximoSeguimiento: string | null; nota: string },
  ) => Promise<boolean>;
  procesando: boolean;
}

export function SeguimientoDialog({
  empresa,
  onOpenChange,
  onConfirmar,
  procesando,
}: SeguimientoDialogProps) {
  const [proximaFecha, setProximaFecha] = useState("");
  const [nota, setNota] = useState("");

  useEffect(() => {
    if (empresa) {
      setProximaFecha(empresa.fechaProximoSeguimiento ?? "");
      setNota("");
    }
  }, [empresa]);

  async function confirmar() {
    if (!empresa) return;
    const ok = await onConfirmar(empresa.id, {
      fechaProximoSeguimiento: proximaFecha || null,
      nota,
    });
    if (ok) onOpenChange(false);
  }

  return (
    <Dialog
      open={empresa !== null}
      onOpenChange={(v) => !procesando && onOpenChange(v)}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <div className="mb-1 flex h-10 w-10 items-center justify-center rounded-full bg-seguimiento/12">
            <CalendarCheck className="h-5 w-5 text-seguimiento" />
          </div>
          <DialogTitle>Marcar seguimiento realizado</DialogTitle>
          <DialogDescription>
            El último contacto de{" "}
            <span className="font-medium text-foreground">
              {empresa?.nombre}
            </span>{" "}
            se registrará con la fecha de hoy ({formatearFecha(hoyISO())}).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field
            id="proxima-fecha"
            label="Nueva fecha de próximo seguimiento"
            hint="Déjala vacía si aún no hay una fecha definida."
          >
            <Input
              id="proxima-fecha"
              type="date"
              value={proximaFecha}
              min={hoyISO()}
              onChange={(e) => setProximaFecha(e.target.value)}
            />
          </Field>

          <Field id="nota-seguimiento" label="Nota sobre lo ocurrido">
            <Textarea
              id="nota-seguimiento"
              value={nota}
              onChange={(e) => setNota(e.target.value)}
              placeholder="Resumen de la llamada, correo o reunión..."
              rows={3}
            />
          </Field>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={procesando}
          >
            Cancelar
          </Button>
          <Button onClick={confirmar} disabled={procesando}>
            {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar seguimiento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
