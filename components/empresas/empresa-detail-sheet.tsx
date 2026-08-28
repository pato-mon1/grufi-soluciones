"use client";

import { useEffect, useState } from "react";
import {
  CalendarCheck,
  CalendarClock,
  Mail,
  Pencil,
  Phone,
  Plus,
  Star,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { EstadoBadge } from "@/components/empresas/estado-badge";
import { HistorialActividades } from "@/components/empresas/historial-actividades";
import { formatearFecha, formatearFechaHora } from "@/lib/date";
import { formatearMonto, montoATextoEntrada, parsearMonto } from "@/lib/money";
import type { Actividad, Contacto, Empresa } from "@/lib/types";

interface EmpresaDetailSheetProps {
  empresa: Empresa | null;
  contactos: Contacto[];
  actividades: Actividad[];
  onOpenChange: (abierto: boolean) => void;
  onEditar: (empresa: Empresa) => void;
  onEliminar: (empresa: Empresa) => void;
  onMarcarSeguimiento: (empresa: Empresa) => void;
  onRegistrarActividad: (empresa: Empresa) => void;
  onGuardarNotas: (id: string, notas: string) => Promise<void>;
  onGuardarMonto: (id: string, monto: number | null) => Promise<void>;
}

const ETIQUETA_GRUPO =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

function TarjetaContacto({ contacto }: { contacto: Contacto }) {
  return (
    <div className="rounded-md border bg-card p-3 text-sm shadow-card">
      <p className="flex items-center gap-1.5 font-medium">
        {contacto.nombre || "Contacto sin nombre"}
        {contacto.principal && (
          <span className="inline-flex items-center gap-1 rounded-full bg-champagne/15 px-1.5 py-0.5 text-[10px] font-medium text-estado-futura-fg">
            <Star className="h-2.5 w-2.5 fill-champagne text-champagne" />
            Principal
          </span>
        )}
      </p>
      {contacto.puesto && (
        <p className="text-xs text-muted-foreground">{contacto.puesto}</p>
      )}
      <div className="mt-2 flex flex-wrap gap-2">
        {contacto.telefono && (
          <a
            href={`tel:${contacto.telefono}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-foreground hover:bg-accent"
          >
            <Phone className="h-3 w-3 text-estado-avance" />
            {contacto.telefono}
          </a>
        )}
        {contacto.correo && (
          <a
            href={`mailto:${contacto.correo}`}
            className="inline-flex items-center gap-1.5 rounded-md border px-2 py-1 text-xs text-foreground hover:bg-accent"
          >
            <Mail className="h-3 w-3 text-estado-avance" />
            {contacto.correo}
          </a>
        )}
        {!contacto.telefono && !contacto.correo && (
          <span className="text-xs text-muted-foreground">Sin datos de contacto</span>
        )}
      </div>
    </div>
  );
}

export function EmpresaDetailSheet({
  empresa,
  contactos,
  actividades,
  onOpenChange,
  onEditar,
  onEliminar,
  onMarcarSeguimiento,
  onRegistrarActividad,
  onGuardarNotas,
  onGuardarMonto,
}: EmpresaDetailSheetProps) {
  const [notas, setNotas] = useState("");
  const [montoTexto, setMontoTexto] = useState("");
  const [montoError, setMontoError] = useState<string | null>(null);
  const [guardando, setGuardando] = useState<"notas" | "monto" | null>(null);

  useEffect(() => {
    if (empresa) {
      setNotas(empresa.notas);
      setMontoTexto(montoATextoEntrada(empresa.montoResultado));
      setMontoError(null);
    }
  }, [empresa]);

  if (!empresa) {
    return (
      <Sheet open={false} onOpenChange={onOpenChange}>
        <SheetContent side="right" />
      </Sheet>
    );
  }

  const notasCambiadas = notas !== empresa.notas;
  const montoCambiado =
    montoTexto.trim() !== montoATextoEntrada(empresa.montoResultado);

  const contactosEmpresa = contactos
    .filter((c) => c.empresaId === empresa.id)
    .sort((a, b) => Number(b.principal) - Number(a.principal));
  const actividadesEmpresa = actividades.filter(
    (a) => a.empresaId === empresa.id,
  );

  async function guardarNotas() {
    if (!empresa) return;
    setGuardando("notas");
    try {
      await onGuardarNotas(empresa.id, notas);
    } finally {
      setGuardando(null);
    }
  }

  async function guardarMonto() {
    if (!empresa) return;
    const parseado = parsearMonto(montoTexto);
    if (!parseado.valido) {
      setMontoError(
        "Ingresa un monto válido mayor o igual a cero, o déjalo vacío.",
      );
      return;
    }
    setMontoError(null);
    setGuardando("monto");
    try {
      await onGuardarMonto(empresa.id, parseado.monto);
    } finally {
      setGuardando(null);
    }
  }

  return (
    <Sheet open onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full gap-0 p-0 sm:max-w-lg">
        <SheetHeader>
          <div className="flex items-start justify-between gap-3 pr-6">
            <div className="space-y-2">
              <SheetTitle className="text-xl">{empresa.nombre}</SheetTitle>
              <EstadoBadge estado={empresa.estado} />
            </div>
          </div>
          <SheetDescription className="sr-only">
            Detalle de la empresa {empresa.nombre}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 overflow-y-auto px-6 py-5 scrollbar-thin">
          {/* Monto del resultado */}
          <section className="space-y-2">
            <h3 className={ETIQUETA_GRUPO}>Monto del resultado (MXN)</h3>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                $
              </span>
              <Input
                type="text"
                inputMode="decimal"
                className="pl-6"
                value={montoTexto}
                onChange={(e) => {
                  setMontoTexto(e.target.value);
                  setMontoError(null);
                }}
                placeholder="Sin monto registrado"
                aria-invalid={Boolean(montoError)}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Actual: {formatearMonto(empresa.montoResultado)}
            </p>
            {montoError && (
              <p className="text-xs font-medium text-destructive" role="alert">
                {montoError}
              </p>
            )}
            {montoCambiado && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={guardarMonto}
                  disabled={guardando === "monto"}
                >
                  Guardar monto
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setMontoTexto(montoATextoEntrada(empresa.montoResultado));
                    setMontoError(null);
                  }}
                  disabled={guardando === "monto"}
                >
                  Descartar
                </Button>
              </div>
            )}
          </section>

          <Separator />

          {/* Contactos */}
          <section className="space-y-3">
            <h3 className={ETIQUETA_GRUPO}>
              Contactos{" "}
              {contactosEmpresa.length > 0 && `(${contactosEmpresa.length})`}
            </h3>
            {contactosEmpresa.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sin contactos. Agrégalos desde “Editar”.
              </p>
            ) : (
              <div className="space-y-2">
                {contactosEmpresa.map((c) => (
                  <TarjetaContacto key={c.id} contacto={c} />
                ))}
              </div>
            )}
          </section>

          <Separator />

          {/* Seguimiento */}
          <section className="space-y-3">
            <h3 className={ETIQUETA_GRUPO}>Fechas de seguimiento</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5 text-seguimiento" />
                  Último contacto
                </div>
                <p className="mt-1 text-sm font-medium">
                  {formatearFecha(empresa.fechaUltimoContacto)}
                </p>
              </div>
              <div className="rounded-md border bg-muted/30 p-3">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarCheck className="h-3.5 w-3.5 text-seguimiento" />
                  Próximo seguimiento
                </div>
                <p className="mt-1 text-sm font-medium">
                  {formatearFecha(empresa.fechaProximoSeguimiento)}
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="w-full"
              onClick={() => onMarcarSeguimiento(empresa)}
            >
              <CalendarCheck className="h-4 w-4" />
              Marcar seguimiento realizado
            </Button>
          </section>

          <Separator />

          {/* Notas */}
          <section className="space-y-2">
            <h3 className={ETIQUETA_GRUPO}>Notas</h3>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Sin notas."
              rows={5}
            />
            {notasCambiadas && (
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={guardarNotas}
                  disabled={guardando === "notas"}
                >
                  Guardar notas
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setNotas(empresa.notas)}
                  disabled={guardando === "notas"}
                >
                  Descartar
                </Button>
              </div>
            )}
          </section>

          <Separator />

          {/* Historial de actividades */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className={ETIQUETA_GRUPO}>Historial de actividades</h3>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onRegistrarActividad(empresa)}
              >
                <Plus className="h-4 w-4" />
                Registrar actividad
              </Button>
            </div>
            <HistorialActividades actividades={actividadesEmpresa} />
          </section>

          <Separator />

          {/* Metadatos */}
          <section className="space-y-1 text-xs text-muted-foreground">
            <p>Creada el {formatearFechaHora(empresa.fechaCreacion)}</p>
            <p>
              Última actualización:{" "}
              {formatearFechaHora(empresa.fechaActualizacion)}
            </p>
          </section>
        </div>

        <div className="flex gap-2 border-t p-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => onEditar(empresa)}
          >
            <Pencil className="h-4 w-4" />
            Editar
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive"
            onClick={() => onEliminar(empresa)}
          >
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
