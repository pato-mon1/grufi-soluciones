"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Field } from "@/components/empresas/field";
import { ContactosEditor } from "@/components/empresas/contactos-editor";
import { cn } from "@/lib/utils";
import { ESTADO_CONFIG } from "@/lib/constants";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { clavesOrdenadas } from "@/lib/estados";
import {
  type BorradorContacto,
  type Empresa,
  type EmpresaInput,
} from "@/lib/types";
import { montoATextoEntrada, parsearMonto } from "@/lib/money";
import {
  tieneErrores,
  validarEmpresa,
  type ErroresFormulario,
} from "@/lib/validation";

interface EmpresaFormSheetProps {
  abierto: boolean;
  onOpenChange: (abierto: boolean) => void;
  empresa: Empresa | null;
  contactosIniciales: BorradorContacto[];
  onGuardar: (input: EmpresaInput) => Promise<Empresa | null>;
  onSincronizarContactos: (
    empresaId: string,
    borradores: BorradorContacto[],
  ) => Promise<void>;
  procesando: boolean;
}

function estadoInicial(empresa: Empresa | null): EmpresaInput {
  return {
    nombre: empresa?.nombre ?? "",
    estado: empresa?.estado ?? "Pendiente",
    montoResultado: empresa?.montoResultado ?? null,
    notas: empresa?.notas ?? "",
    fechaUltimoContacto: empresa?.fechaUltimoContacto ?? null,
    fechaProximoSeguimiento: empresa?.fechaProximoSeguimiento ?? null,
    requiereSeguimiento: empresa?.requiereSeguimiento ?? false,
  };
}

const TITULO_GRUPO =
  "text-xs font-semibold uppercase tracking-wide text-muted-foreground";

export function EmpresaFormSheet({
  abierto,
  onOpenChange,
  empresa,
  contactosIniciales,
  onGuardar,
  onSincronizarContactos,
  procesando,
}: EmpresaFormSheetProps) {
  const esEdicion = empresa !== null;
  const { estadosConfig } = useFase2();
  const clavesEstado = clavesOrdenadas(estadosConfig);
  const [datos, setDatos] = useState<EmpresaInput>(() => estadoInicial(empresa));
  const [montoTexto, setMontoTexto] = useState(() =>
    montoATextoEntrada(empresa?.montoResultado ?? null),
  );
  const [contactos, setContactos] = useState<BorradorContacto[]>(
    () => contactosIniciales,
  );
  const [errores, setErrores] = useState<ErroresFormulario>({});

  // Reinicia el formulario cada vez que se abre o cambia la empresa.
  useEffect(() => {
    if (abierto) {
      setDatos(estadoInicial(empresa));
      setMontoTexto(montoATextoEntrada(empresa?.montoResultado ?? null));
      setContactos(contactosIniciales.map((c) => ({ ...c })));
      setErrores({});
    }
    // contactosIniciales cambia de identidad en cada render del padre; solo
    // interesa el snapshot al abrir.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [abierto, empresa]);

  const idFormulario = useMemo(
    () => (esEdicion ? `editar-${empresa?.id}` : "nueva-empresa"),
    [esEdicion, empresa?.id],
  );

  function limpiarError(campo: keyof ErroresFormulario) {
    if (errores[campo]) {
      setErrores((prev) => {
        const copia = { ...prev };
        delete copia[campo];
        return copia;
      });
    }
  }

  function actualizar<K extends keyof EmpresaInput>(
    campo: K,
    valor: EmpresaInput[K],
  ) {
    setDatos((prev) => ({ ...prev, [campo]: valor }) as EmpresaInput);
    limpiarError(campo);
  }

  async function manejarEnvio(evento: React.FormEvent) {
    evento.preventDefault();

    const montoParseado = parsearMonto(montoTexto);
    const datosNormalizados: EmpresaInput = {
      ...datos,
      nombre: datos.nombre.trim(),
      montoResultado: montoParseado.monto,
      notas: datos.notas.trim(),
    };

    const validacion = validarEmpresa(datosNormalizados);
    if (!montoParseado.valido) {
      validacion.montoResultado =
        "Ingresa un monto válido mayor o igual a cero, o déjalo vacío.";
    }

    if (tieneErrores(validacion)) {
      setErrores(validacion);
      toast.error("Revisa los campos marcados en el formulario.");
      return;
    }

    const guardada = await onGuardar(datosNormalizados);
    if (!guardada) return;
    await onSincronizarContactos(guardada.id, contactos);
    onOpenChange(false);
  }

  return (
    <Sheet open={abierto} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="w-full gap-0 p-0 sm:max-w-lg"
        onInteractOutside={(e) => {
          if (procesando) e.preventDefault();
        }}
      >
        <SheetHeader>
          <SheetTitle>
            {esEdicion ? "Editar empresa" : "Agregar empresa"}
          </SheetTitle>
          <SheetDescription>
            {esEdicion
              ? "Actualiza la información de la oportunidad."
              : "Registra una nueva oportunidad comercial."}
          </SheetDescription>
        </SheetHeader>

        <form
          id={idFormulario}
          onSubmit={manejarEnvio}
          className="flex-1 space-y-6 overflow-y-auto px-6 py-5 scrollbar-thin"
        >
          {/* Información general */}
          <fieldset className="space-y-4">
            <legend className={TITULO_GRUPO}>Información general</legend>

            <Field
              id="nombre"
              label="Nombre de la empresa"
              requerido
              error={errores.nombre}
            >
              <Input
                id="nombre"
                value={datos.nombre}
                onChange={(e) => actualizar("nombre", e.target.value)}
                placeholder="Ej. Industrias del Norte"
                autoComplete="off"
                aria-invalid={Boolean(errores.nombre)}
                autoFocus
              />
            </Field>

            <Field id="estado" label="Estado" requerido error={errores.estado}>
              <Select
                value={datos.estado}
                onValueChange={(valor) =>
                  actualizar("estado", valor as EmpresaInput["estado"])
                }
              >
                <SelectTrigger id="estado" aria-invalid={Boolean(errores.estado)}>
                  <SelectValue placeholder="Selecciona un estado" />
                </SelectTrigger>
                <SelectContent>
                  {clavesEstado.map((opcion) => {
                    const r = estadosConfig[opcion];
                    return (
                      <SelectItem
                        key={opcion}
                        value={opcion}
                        className={cn(
                          datos.estado === opcion &&
                            !r?.personalizado &&
                            ESTADO_CONFIG[opcion].fondoSuave,
                        )}
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className={cn(
                              "h-1.5 w-1.5 rounded-full",
                              !r?.personalizado && ESTADO_CONFIG[opcion].dot,
                            )}
                            style={
                              r?.personalizado
                                ? { backgroundColor: r.color }
                                : undefined
                            }
                          />
                          {r?.etiqueta ?? opcion}
                        </span>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </Field>

            <Field
              id="montoResultado"
              label="Monto del resultado (MXN)"
              hint="Se mostrará como $250,000 MXN. Déjalo vacío para no registrar monto."
              error={errores.montoResultado}
            >
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  $
                </span>
                <Input
                  id="montoResultado"
                  type="text"
                  inputMode="decimal"
                  className="pl-6"
                  value={montoTexto}
                  onChange={(e) => {
                    setMontoTexto(e.target.value);
                    limpiarError("montoResultado");
                  }}
                  placeholder="Vacío = sin monto"
                  aria-invalid={Boolean(errores.montoResultado)}
                />
              </div>
              {montoTexto.trim() !== "" && (
                <button
                  type="button"
                  onClick={() => {
                    setMontoTexto("");
                    limpiarError("montoResultado");
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-destructive transition-colors hover:underline"
                >
                  <Trash2 className="h-3 w-3" />
                  Quitar monto
                </button>
              )}
            </Field>
          </fieldset>

          {/* Contactos */}
          <fieldset className="space-y-3">
            <legend className={TITULO_GRUPO}>Contactos</legend>
            <ContactosEditor contactos={contactos} onChange={setContactos} />
          </fieldset>

          {/* Seguimiento */}
          <fieldset className="space-y-4">
            <legend className={TITULO_GRUPO}>Seguimiento</legend>

            <div className="grid gap-4 sm:grid-cols-2">
              <Field id="fechaUltimoContacto" label="Fecha del último contacto">
                <Input
                  id="fechaUltimoContacto"
                  type="date"
                  value={datos.fechaUltimoContacto ?? ""}
                  onChange={(e) =>
                    actualizar("fechaUltimoContacto", e.target.value || null)
                  }
                />
              </Field>

              <Field
                id="fechaProximoSeguimiento"
                label="Fecha del próximo seguimiento"
                error={errores.fechaProximoSeguimiento}
              >
                <Input
                  id="fechaProximoSeguimiento"
                  type="date"
                  value={datos.fechaProximoSeguimiento ?? ""}
                  onChange={(e) =>
                    actualizar("fechaProximoSeguimiento", e.target.value || null)
                  }
                  aria-invalid={Boolean(errores.fechaProximoSeguimiento)}
                />
              </Field>
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border bg-muted/30 p-3">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">Marcar “Próximo seguimiento”</p>
                <p className="text-xs text-muted-foreground">
                  Marca esta empresa como pendiente de seguimiento. No requiere
                  fecha.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={datos.requiereSeguimiento}
                aria-label="Marcar para próximo seguimiento"
                onClick={() =>
                  actualizar("requiereSeguimiento", !datos.requiereSeguimiento)
                }
                className={cn(
                  "mt-0.5 inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
                  datos.requiereSeguimiento
                    ? "border-seguimiento bg-seguimiento"
                    : "border-input bg-muted",
                )}
              >
                <span
                  className={cn(
                    "inline-block h-5 w-5 rounded-full bg-card shadow transition-transform",
                    datos.requiereSeguimiento
                      ? "translate-x-5"
                      : "translate-x-0.5",
                  )}
                />
              </button>
            </div>

            <Field id="notas" label="Notas">
              <Textarea
                id="notas"
                value={datos.notas}
                onChange={(e) => actualizar("notas", e.target.value)}
                placeholder="Contexto, acuerdos, próximos pasos..."
                rows={4}
              />
            </Field>
          </fieldset>
        </form>

        <SheetFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={procesando}
          >
            Cancelar
          </Button>
          <Button type="submit" form={idFormulario} disabled={procesando}>
            {procesando && <Loader2 className="h-4 w-4 animate-spin" />}
            Guardar empresa
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
