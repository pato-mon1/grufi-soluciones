"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/empresas/field";
import { ahoraLocalISO } from "@/lib/date";
import {
  TIPOS_ACTIVIDAD,
  type Empresa,
  type NuevaActividad,
  type TipoActividad,
} from "@/lib/types";

interface RegistrarActividadDialogProps {
  empresa: Empresa | null;
  onOpenChange: (abierto: boolean) => void;
  onGuardar: (input: NuevaActividad) => Promise<unknown>;
  procesando: boolean;
}

export function RegistrarActividadDialog({
  empresa,
  onOpenChange,
  onGuardar,
  procesando,
}: RegistrarActividadDialogProps) {
  const [tipo, setTipo] = useState<TipoActividad>("Llamada");
  const [fechaHora, setFechaHora] = useState("");
  const [descripcion, setDescripcion] = useState("");

  useEffect(() => {
    if (empresa) {
      setTipo("Llamada");
      setFechaHora(ahoraLocalISO());
      setDescripcion("");
    }
  }, [empresa]);

  async function guardar() {
    if (!empresa) return;
    const iso = fechaHora
      ? new Date(fechaHora).toISOString()
      : new Date().toISOString();
    const ok = await onGuardar({
      empresaId: empresa.id,
      tipo,
      fechaHora: iso,
      descripcion: descripcion.trim(),
    });
    if (ok) {
      toast.dismiss();
      onOpenChange(false);
    }
  }

  return (
    <Dialog
      open={empresa !== null}
      onOpenChange={(v) => !procesando && onOpenChange(v)}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Registrar actividad</DialogTitle>
          <DialogDescription>
            Se agregará al historial de{" "}
            <span className="font-medium text-foreground">{empresa?.nombre}</span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field id="act-tipo" label="Tipo de actividad">
            <Select
              value={tipo}
              onValueChange={(v) => setTipo(v as TipoActividad)}
            >
              <SelectTrigger id="act-tipo">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIPOS_ACTIVIDAD.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="act-fecha" label="Fecha y hora">
            <Input
              id="act-fecha"
              type="datetime-local"
              value={fechaHora}
              onChange={(e) => setFechaHora(e.target.value)}
            />
          </Field>

          <Field id="act-desc" label="Descripción">
            <Textarea
              id="act-desc"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Detalle de la llamada, correo, junta o nota..."
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
          <Button onClick={guardar} disabled={procesando}>
            {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar actividad
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
