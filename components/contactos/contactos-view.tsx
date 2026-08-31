"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  MessageCircle,
  Pencil,
  Phone,
  Plus,
  Search,
  Star,
  Trash2,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/app-shell/page-header";
import { Field } from "@/components/empresas/field";
import { EstadoBadge } from "@/components/empresas/estado-badge";
import { HistorialActividades } from "@/components/empresas/historial-actividades";
import { SeguimientoDialog } from "@/components/empresas/seguimiento-dialog";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { formatearFecha } from "@/lib/date";
import type { Contacto, ContactoInput, Empresa } from "@/lib/types";

const CONTACTO_VACIO: ContactoInput = {
  nombre: "",
  puesto: "",
  telefono: "",
  correo: "",
  principal: false,
};

/** Devuelve un enlace wa.me a partir de un teléfono, o null si no es válido. */
function enlaceWhatsApp(telefono: string): string | null {
  const digitos = telefono.replace(/\D/g, "");
  if (digitos.length < 10) return null;
  const conLada = digitos.length === 10 ? `52${digitos}` : digitos;
  return `https://wa.me/${conLada}`;
}

function correoValido(valor: string): boolean {
  if (!valor) return true;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);
}

/** Botón-icono que actúa como enlace (tel:/mailto:/wa.me) o se muestra deshabilitado. */
function IconoAccion({
  href,
  externo,
  disabled,
  label,
  children,
}: {
  href?: string;
  externo?: boolean;
  disabled?: boolean;
  label: string;
  children: React.ReactNode;
}) {
  if (disabled || !href) {
    return (
      <Button
        size="icon"
        variant="ghost"
        className="h-8 w-8"
        disabled
        aria-label={`${label} (no disponible)`}
      >
        {children}
      </Button>
    );
  }
  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-8 w-8"
      asChild
      aria-label={label}
      title={label}
    >
      <a href={href} {...(externo ? { target: "_blank", rel: "noreferrer" } : {})}>
        {children}
      </a>
    </Button>
  );
}

export function ContactosView() {
  const {
    empresas,
    contactos,
    actividades,
    cargando,
    procesando,
    agregarContacto,
    editarContacto,
    eliminarContacto,
    marcarContactoPrincipal,
    marcarSeguimiento,
  } = useEmpresas();

  const [busqueda, setBusqueda] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState<string>("todas");
  const [formAbierto, setFormAbierto] = useState(false);
  const [enEdicion, setEnEdicion] = useState<Contacto | null>(null);
  const [aEliminar, setAEliminar] = useState<Contacto | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [seguimientoEmpresaId, setSeguimientoEmpresaId] = useState<string | null>(
    null,
  );

  const nombrePorEmpresa = useMemo(() => {
    const mapa = new Map<string, Empresa>();
    for (const e of empresas) mapa.set(e.id, e);
    return mapa;
  }, [empresas]);

  const lista = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    return contactos
      .filter((c) => {
        if (empresaFiltro !== "todas" && c.empresaId !== empresaFiltro) {
          return false;
        }
        if (!termino) return true;
        const empresa = nombrePorEmpresa.get(c.empresaId)?.nombre ?? "";
        return (
          c.nombre.toLowerCase().includes(termino) ||
          c.puesto.toLowerCase().includes(termino) ||
          c.correo.toLowerCase().includes(termino) ||
          c.telefono.toLowerCase().includes(termino) ||
          empresa.toLowerCase().includes(termino)
        );
      })
      .sort((a, b) => {
        const ea = nombrePorEmpresa.get(a.empresaId)?.nombre ?? "";
        const eb = nombrePorEmpresa.get(b.empresaId)?.nombre ?? "";
        if (ea !== eb) return ea.localeCompare(eb);
        if (a.principal !== b.principal) return a.principal ? -1 : 1;
        return a.nombre.localeCompare(b.nombre);
      });
  }, [contactos, busqueda, empresaFiltro, nombrePorEmpresa]);

  const detalle = detalleId
    ? (contactos.find((c) => c.id === detalleId) ?? null)
    : null;
  const detalleEmpresa = detalle
    ? (nombrePorEmpresa.get(detalle.empresaId) ?? null)
    : null;
  const detalleActividades = detalle
    ? actividades.filter((a) => a.empresaId === detalle.empresaId)
    : [];
  const seguimientoEmpresa = seguimientoEmpresaId
    ? (nombrePorEmpresa.get(seguimientoEmpresaId) ?? null)
    : null;

  async function guardarForm(empresaId: string, datos: ContactoInput) {
    if (enEdicion) {
      await editarContacto(enEdicion.id, datos);
      toast.success("Contacto actualizado");
    } else {
      await agregarContacto(empresaId, datos);
      toast.success("Contacto agregado");
    }
    setFormAbierto(false);
    setEnEdicion(null);
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Contactos"
        subtitle="Personas de contacto de cada empresa, con acceso directo a llamar, escribir o dar seguimiento."
        action={
          <Button
            className="w-full sm:w-auto"
            onClick={() => {
              setEnEdicion(null);
              setFormAbierto(true);
            }}
          >
            <Plus className="h-4 w-4 text-champagne" />
            Nuevo contacto
          </Button>
        }
      />

      <Card className="overflow-hidden">
        <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center">
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              placeholder="Buscar por nombre, empresa, correo..."
              className="pl-9"
              aria-label="Buscar contacto"
            />
          </div>
          <Select value={empresaFiltro} onValueChange={setEmpresaFiltro}>
            <SelectTrigger className="w-full sm:w-56" aria-label="Filtrar por empresa">
              <SelectValue placeholder="Todas las empresas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todas">Todas las empresas</SelectItem>
              {empresas.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.nombre}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {cargando ? (
          <div className="space-y-3 p-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : lista.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-16 text-center">
            <Users className="h-8 w-8 text-muted-foreground" />
            <p className="font-medium">Sin contactos</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {contactos.length === 0
                ? "Agrega el primer contacto de una empresa."
                : "Ningún contacto coincide con la búsqueda."}
            </p>
          </div>
        ) : (
          <>
            {/* Escritorio */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Nombre</TableHead>
                    <TableHead>Empresa</TableHead>
                    <TableHead>Cargo</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Correo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lista.map((c) => {
                    const empresa = nombrePorEmpresa.get(c.empresaId);
                    const wa = enlaceWhatsApp(c.telefono);
                    return (
                      <TableRow key={c.id}>
                        <TableCell>
                          <button
                            type="button"
                            onClick={() => setDetalleId(c.id)}
                            className="flex items-center gap-1.5 text-left font-medium text-foreground hover:text-primary hover:underline"
                          >
                            {c.principal && (
                              <Star className="h-3.5 w-3.5 shrink-0 fill-champagne text-champagne" />
                            )}
                            {c.nombre || "Sin nombre"}
                          </button>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {empresa?.nombre ?? "—"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {c.puesto || "—"}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {c.telefono || "—"}
                        </TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">
                          {c.correo || "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-0.5">
                            <IconoAccion
                              disabled={!c.telefono}
                              href={c.telefono ? `tel:${c.telefono}` : undefined}
                              label="Llamar"
                            >
                              <Phone className="h-4 w-4" />
                            </IconoAccion>
                            <IconoAccion
                              disabled={!wa}
                              href={wa ?? undefined}
                              externo
                              label="WhatsApp"
                            >
                              <MessageCircle className="h-4 w-4" />
                            </IconoAccion>
                            <IconoAccion
                              disabled={!c.correo}
                              href={c.correo ? `mailto:${c.correo}` : undefined}
                              label="Correo"
                            >
                              <Mail className="h-4 w-4" />
                            </IconoAccion>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8"
                              aria-label="Editar contacto"
                              onClick={() => {
                                setEnEdicion(c);
                                setFormAbierto(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              className="h-8 w-8 text-destructive hover:text-destructive"
                              aria-label="Eliminar contacto"
                              onClick={() => setAEliminar(c)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Celular */}
            <ul className="divide-y md:hidden">
              {lista.map((c) => {
                const empresa = nombrePorEmpresa.get(c.empresaId);
                const wa = enlaceWhatsApp(c.telefono);
                return (
                  <li key={c.id} className="space-y-2 p-4">
                    <button
                      type="button"
                      onClick={() => setDetalleId(c.id)}
                      className="flex items-center gap-1.5 text-left font-medium hover:text-primary hover:underline"
                    >
                      {c.principal && (
                        <Star className="h-3.5 w-3.5 fill-champagne text-champagne" />
                      )}
                      {c.nombre || "Sin nombre"}
                    </button>
                    <p className="text-sm text-muted-foreground">
                      {empresa?.nombre ?? "—"}
                      {c.puesto ? ` · ${c.puesto}` : ""}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {c.telefono && (
                        <a
                          href={`tel:${c.telefono}`}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        >
                          <Phone className="h-3.5 w-3.5" />
                          Llamar
                        </a>
                      )}
                      {wa && (
                        <a
                          href={wa}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                          WhatsApp
                        </a>
                      )}
                      {c.correo && (
                        <a
                          href={`mailto:${c.correo}`}
                          className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                        >
                          <Mail className="h-3.5 w-3.5" />
                          Correo
                        </a>
                      )}
                    </div>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => {
                          setEnEdicion(c);
                          setFormAbierto(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-destructive hover:text-destructive"
                        onClick={() => setAEliminar(c)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Card>

      {/* Formulario nuevo / editar */}
      <ContactoFormDialog
        abierto={formAbierto}
        contacto={enEdicion}
        empresas={empresas}
        empresaPreseleccion={
          empresaFiltro !== "todas" ? empresaFiltro : undefined
        }
        procesando={procesando}
        onOpenChange={(v) => {
          setFormAbierto(v);
          if (!v) setEnEdicion(null);
        }}
        onGuardar={guardarForm}
      />

      {/* Confirmar eliminación */}
      <Dialog
        open={aEliminar !== null}
        onOpenChange={(v) => !v && setAEliminar(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar contacto</DialogTitle>
            <DialogDescription>
              Se eliminará “{aEliminar?.nombre || "este contacto"}”. Esta acción
              no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setAEliminar(null)}
              disabled={procesando}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={procesando}
              onClick={async () => {
                if (!aEliminar) return;
                await eliminarContacto(aEliminar.id);
                toast.success("Contacto eliminado");
                setAEliminar(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Panel de detalle */}
      <Sheet
        open={detalle !== null}
        onOpenChange={(v) => !v && setDetalleId(null)}
      >
        <SheetContent side="right" className="w-full max-w-md overflow-y-auto">
          {detalle && (
            <>
              <SheetHeader>
                <SheetTitle className="flex items-center gap-2">
                  {detalle.principal && (
                    <Star className="h-4 w-4 fill-champagne text-champagne" />
                  )}
                  {detalle.nombre || "Contacto"}
                </SheetTitle>
                <SheetDescription>
                  {detalle.puesto || "Sin cargo"} ·{" "}
                  {detalleEmpresa?.nombre ?? "Sin empresa"}
                </SheetDescription>
              </SheetHeader>

              <div className="mt-4 space-y-4">
                <div className="flex flex-wrap gap-2">
                  {detalle.telefono && (
                    <a
                      href={`tel:${detalle.telefono}`}
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm"
                    >
                      <Phone className="h-4 w-4" />
                      {detalle.telefono}
                    </a>
                  )}
                  {enlaceWhatsApp(detalle.telefono) && (
                    <a
                      href={enlaceWhatsApp(detalle.telefono) as string}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm"
                    >
                      <MessageCircle className="h-4 w-4" />
                      WhatsApp
                    </a>
                  )}
                  {detalle.correo && (
                    <a
                      href={`mailto:${detalle.correo}`}
                      className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-sm"
                    >
                      <Mail className="h-4 w-4" />
                      {detalle.correo}
                    </a>
                  )}
                </div>

                {detalleEmpresa && (
                  <div className="rounded-md border bg-card p-3 text-sm shadow-card">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium">{detalleEmpresa.nombre}</span>
                      <EstadoBadge estado={detalleEmpresa.estado} />
                    </div>
                    {detalleEmpresa.fechaProximoSeguimiento && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Próximo seguimiento:{" "}
                        {formatearFecha(detalleEmpresa.fechaProximoSeguimiento)}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  {!detalle.principal && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={procesando}
                      onClick={async () => {
                        await marcarContactoPrincipal(detalle.id);
                        toast.success("Contacto principal actualizado");
                      }}
                    >
                      <Star className="h-4 w-4" />
                      Marcar como principal
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEnEdicion(detalle);
                      setFormAbierto(true);
                    }}
                  >
                    <Pencil className="h-4 w-4" />
                    Editar
                  </Button>
                  {detalleEmpresa && (
                    <Button
                      size="sm"
                      onClick={() =>
                        setSeguimientoEmpresaId(detalle.empresaId)
                      }
                    >
                      Crear seguimiento
                    </Button>
                  )}
                </div>

                <div>
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Historial de la empresa
                  </h3>
                  <HistorialActividades actividades={detalleActividades} />
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>

      <SeguimientoDialog
        empresa={seguimientoEmpresa}
        onOpenChange={(v) => !v && setSeguimientoEmpresaId(null)}
        onConfirmar={marcarSeguimiento}
        procesando={procesando}
      />
    </div>
  );
}

function ContactoFormDialog({
  abierto,
  contacto,
  empresas,
  empresaPreseleccion,
  procesando,
  onOpenChange,
  onGuardar,
}: {
  abierto: boolean;
  contacto: Contacto | null;
  empresas: Empresa[];
  empresaPreseleccion?: string;
  procesando: boolean;
  onOpenChange: (abierto: boolean) => void;
  onGuardar: (empresaId: string, datos: ContactoInput) => Promise<void>;
}) {
  const editando = contacto !== null;
  const [empresaId, setEmpresaId] = useState("");
  const [datos, setDatos] = useState<ContactoInput>(CONTACTO_VACIO);
  const [errores, setErrores] = useState<{ nombre?: string; correo?: string }>(
    {},
  );

  useEffect(() => {
    if (!abierto) return;
    setErrores({});
    if (contacto) {
      setEmpresaId(contacto.empresaId);
      setDatos({
        nombre: contacto.nombre,
        puesto: contacto.puesto,
        telefono: contacto.telefono,
        correo: contacto.correo,
        principal: contacto.principal,
      });
    } else {
      setEmpresaId(empresaPreseleccion ?? "");
      setDatos(CONTACTO_VACIO);
    }
  }, [abierto, contacto, empresaPreseleccion]);

  function actualizar<K extends keyof ContactoInput>(
    clave: K,
    valor: ContactoInput[K],
  ) {
    setDatos((prev) => ({ ...prev, [clave]: valor }));
  }

  async function enviar() {
    const nuevosErrores: { nombre?: string; correo?: string } = {};
    if (!datos.nombre.trim()) nuevosErrores.nombre = "El nombre es obligatorio.";
    if (!correoValido(datos.correo)) {
      nuevosErrores.correo = "El correo no tiene un formato válido.";
    }
    if (!empresaId) {
      toast.error("Selecciona una empresa.");
      return;
    }
    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;
    await onGuardar(empresaId, {
      ...datos,
      nombre: datos.nombre.trim(),
      puesto: datos.puesto.trim(),
      telefono: datos.telefono.trim(),
      correo: datos.correo.trim(),
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar contacto" : "Nuevo contacto"}
          </DialogTitle>
          <DialogDescription>
            {editando
              ? "Actualiza los datos del contacto."
              : "Registra una persona de contacto para una empresa."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field id="ct-empresa" label="Empresa" requerido>
            <Select
              value={empresaId}
              onValueChange={setEmpresaId}
              disabled={editando}
            >
              <SelectTrigger id="ct-empresa">
                <SelectValue placeholder="Selecciona una empresa" />
              </SelectTrigger>
              <SelectContent>
                {empresas.map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.nombre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <Field id="ct-nombre" label="Nombre" requerido error={errores.nombre}>
            <Input
              id="ct-nombre"
              value={datos.nombre}
              onChange={(e) => actualizar("nombre", e.target.value)}
              autoComplete="off"
            />
          </Field>

          <Field id="ct-puesto" label="Cargo">
            <Input
              id="ct-puesto"
              value={datos.puesto}
              onChange={(e) => actualizar("puesto", e.target.value)}
              autoComplete="off"
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="ct-tel" label="Teléfono">
              <Input
                id="ct-tel"
                value={datos.telefono}
                inputMode="tel"
                onChange={(e) => actualizar("telefono", e.target.value)}
                autoComplete="off"
              />
            </Field>
            <Field id="ct-correo" label="Correo" error={errores.correo}>
              <Input
                id="ct-correo"
                type="email"
                value={datos.correo}
                onChange={(e) => actualizar("correo", e.target.value)}
                autoComplete="off"
              />
            </Field>
          </div>

          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-input accent-champagne"
              checked={datos.principal}
              onChange={(e) => actualizar("principal", e.target.checked)}
            />
            Marcar como contacto principal de la empresa
          </label>
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
            {editando ? "Guardar cambios" : "Agregar contacto"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
