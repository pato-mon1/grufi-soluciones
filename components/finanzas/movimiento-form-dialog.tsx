"use client";

import { useEffect, useState } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/empresas/field";
import { hoyISO } from "@/lib/date";
import { montoATextoEntrada, parsearMonto } from "@/lib/money";
import {
  ESTADOS_MOVIMIENTO,
  type CategoriaFinanza,
  type EstadoMovimiento,
  type MovimientoFinanciero,
  type MovimientoInput,
  type TipoMovimiento,
} from "@/lib/types";

const ETIQUETA_ESTADO: Record<EstadoMovimiento, string> = {
  pendiente: "Pendiente",
  liquidado: "Liquidado",
  cancelado: "Cancelado",
};

export interface PresetMovimiento {
  tipo?: TipoMovimiento;
  estado?: EstadoMovimiento;
  empresaId?: string | null;
}

function inicial(preset?: PresetMovimiento): MovimientoInput {
  return {
    empresaId: preset?.empresaId ?? null,
    categoriaId: null,
    tipo: preset?.tipo ?? "ingreso",
    concepto: "",
    monto: 0,
    estado: preset?.estado ?? "liquidado",
    fecha: hoyISO(),
    fechaLiquidado: preset?.estado === "pendiente" ? null : hoyISO(),
    notas: "",
  };
}

export function MovimientoFormDialog({
  abierto,
  movimiento,
  preset,
  titulo,
  categorias,
  empresas,
  procesando,
  onOpenChange,
  onGuardar,
}: {
  abierto: boolean;
  movimiento: MovimientoFinanciero | null;
  preset?: PresetMovimiento;
  titulo?: string;
  categorias: CategoriaFinanza[];
  empresas: { id: string; nombre: string }[];
  procesando: boolean;
  onOpenChange: (abierto: boolean) => void;
  onGuardar: (datos: MovimientoInput) => Promise<void>;
}) {
  const editando = movimiento !== null;
  const [datos, setDatos] = useState<MovimientoInput>(inicial(preset));
  const [montoTexto, setMontoTexto] = useState("");
  const [errores, setErrores] = useState<{ concepto?: string; monto?: string }>(
    {},
  );

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    if (movimiento) {
      setDatos({
        empresaId: movimiento.empresaId,
        categoriaId: movimiento.categoriaId,
        tipo: movimiento.tipo,
        concepto: movimiento.concepto,
        monto: movimiento.monto,
        estado: movimiento.estado,
        fecha: movimiento.fecha,
        fechaLiquidado: movimiento.fechaLiquidado,
        notas: movimiento.notas,
      });
      setMontoTexto(montoATextoEntrada(movimiento.monto));
    } else {
      setDatos(inicial(preset));
      setMontoTexto("");
    }
  }, [abierto, movimiento, preset]);

  function set<K extends keyof MovimientoInput>(
    clave: K,
    valor: MovimientoInput[K],
  ) {
    setDatos((prev) => ({ ...prev, [clave]: valor }));
  }

  const categoriasDelTipo = categorias.filter(
    (c) => c.tipo === datos.tipo && (!c.archivada || c.id === datos.categoriaId),
  );

  async function enviar() {
    const err: { concepto?: string; monto?: string } = {};
    if (!datos.concepto.trim()) err.concepto = "El concepto es obligatorio.";
    const parsed = parsearMonto(montoTexto);
    if (!parsed.valido || parsed.monto === null || parsed.monto <= 0) {
      err.monto = "Escribe un monto mayor a 0.";
    }
    setErrores(err);
    if (Object.keys(err).length > 0) return;

    const estado = datos.estado;
    await onGuardar({
      ...datos,
      concepto: datos.concepto.trim(),
      monto: parsed.monto as number,
      fechaLiquidado:
        estado === "liquidado" ? (datos.fechaLiquidado ?? datos.fecha) : null,
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {titulo ??
              (editando ? "Editar movimiento" : "Nuevo movimiento")}
          </DialogTitle>
          <DialogDescription>
            Registra un ingreso o egreso. Los montos se guardan con 2 decimales.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Field id="m-tipo" label="Tipo">
              <Select
                value={datos.tipo}
                onValueChange={(v) => {
                  set("tipo", v as TipoMovimiento);
                  set("categoriaId", null);
                }}
              >
                <SelectTrigger id="m-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ingreso">Ingreso</SelectItem>
                  <SelectItem value="egreso">Egreso</SelectItem>
                </SelectContent>
              </Select>
            </Field>

            <Field id="m-estado" label="Estado">
              <Select
                value={datos.estado}
                onValueChange={(v) => set("estado", v as EstadoMovimiento)}
              >
                <SelectTrigger id="m-estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTADOS_MOVIMIENTO.map((e) => (
                    <SelectItem key={e} value={e}>
                      {ETIQUETA_ESTADO[e]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field id="m-concepto" label="Concepto" requerido error={errores.concepto}>
            <Input
              id="m-concepto"
              value={datos.concepto}
              onChange={(e) => set("concepto", e.target.value)}
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="m-monto" label="Monto (MXN)" requerido error={errores.monto}>
              <Input
                id="m-monto"
                inputMode="decimal"
                value={montoTexto}
                onChange={(e) => setMontoTexto(e.target.value)}
                placeholder="0.00"
              />
            </Field>
            <Field id="m-fecha" label="Fecha">
              <Input
                id="m-fecha"
                type="date"
                value={datos.fecha}
                onChange={(e) => set("fecha", e.target.value || hoyISO())}
              />
            </Field>
          </div>

          <Field id="m-categoria" label="Categoría">
            <Select
              value={datos.categoriaId ?? "ninguna"}
              onValueChange={(v) =>
                set("categoriaId", v === "ninguna" ? null : v)
              }
            >
              <SelectTrigger id="m-categoria">
                <SelectValue placeholder="Sin categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna">Sin categoría</SelectItem>
                {categoriasDelTipo.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="m-empresa" label="Empresa relacionada">
            <Select
              value={datos.empresaId ?? "ninguna"}
              onValueChange={(v) => set("empresaId", v === "ninguna" ? null : v)}
            >
              <SelectTrigger id="m-empresa">
                <SelectValue placeholder="Ninguna" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ninguna">Ninguna</SelectItem>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="m-notas" label="Notas">
            <Textarea
              id="m-notas"
              rows={2}
              value={datos.notas}
              onChange={(e) => set("notas", e.target.value)}
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
          <Button onClick={enviar} disabled={procesando}>
            {editando ? "Guardar cambios" : "Guardar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
