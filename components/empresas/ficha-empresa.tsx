"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarClock,
  Check,
  Mail,
  MessageCircle,
  Phone,
  Plus,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/app-shell/page-header";
import { EstadoQuickSelect } from "@/components/empresas/estado-quick-select";
import { MontoResultadoCell } from "@/components/empresas/monto-resultado-cell";
import { ProximoSeguimientoCell } from "@/components/empresas/proximo-seguimiento-cell";
import { HistorialActividades } from "@/components/empresas/historial-actividades";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { formatearFecha, hoyISO } from "@/lib/date";
import { siguienteOrden } from "@/lib/tareas";
import type { TipoActividad } from "@/lib/types";

/** Tope superior de los selectores de fecha (permite proyectar a futuro). */
const FECHA_MAXIMA = "2035-12-31";

const TIPOS_JUNTA: { valor: TipoActividad; etiqueta: string }[] = [
  { valor: "Junta", etiqueta: "Junta" },
  { valor: "Llamada", etiqueta: "Llamada" },
  { valor: "Correo", etiqueta: "Correo" },
  { valor: "Nota", etiqueta: "Nota" },
];

/** Enlace wa.me a partir del teléfono (lada 52 por defecto). */
function whatsapp(telefono: string): string | null {
  const d = telefono.replace(/\D/g, "");
  if (d.length < 10) return null;
  return `https://wa.me/${d.length === 10 ? `52${d}` : d}`;
}

export function FichaEmpresa({ id }: { id: string }) {
  const {
    empresas,
    contactos,
    actividades,
    cargando,
    procesando,
    cambiarEstado,
    actualizarMonto,
    actualizarNotas,
    actualizarProximoSeguimiento,
    completarProximoSeguimiento,
    registrarActividad,
  } = useEmpresas();
  const {
    tareas,
    crearTarea,
    actualizarTarea,
    eliminarTarea,
  } = useFase2();

  const empresa = useMemo(
    () => empresas.find((e) => e.id === id) ?? null,
    [empresas, id],
  );

  const actividadesEmpresa = useMemo(
    () =>
      actividades
        .filter((a) => a.empresaId === id)
        .sort((a, b) => b.fechaHora.localeCompare(a.fechaHora)),
    [actividades, id],
  );

  const ultimaJunta = actividadesEmpresa.find(
    (a) => a.tipo === "Junta" || a.tipo === "Llamada",
  );

  const contactosEmpresa = useMemo(
    () => contactos.filter((c) => c.empresaId === id),
    [contactos, id],
  );

  const pendientes = useMemo(
    () =>
      tareas
        .filter((t) => t.empresaId === id)
        .sort((a, b) => {
          const ah = a.estado === "hecha" ? 1 : 0;
          const bh = b.estado === "hecha" ? 1 : 0;
          if (ah !== bh) return ah - bh;
          return a.orden - b.orden;
        }),
    [tareas, id],
  );

  // Composer de junta
  const [tipo, setTipo] = useState<TipoActividad>("Junta");
  const [fechaJunta, setFechaJunta] = useState(hoyISO());
  const [detalle, setDetalle] = useState("");
  const [proxima, setProxima] = useState("");
  const [guardandoJunta, setGuardandoJunta] = useState(false);

  // Notas generales (autoguardado al salir del campo)
  const [notas, setNotas] = useState("");
  useEffect(() => {
    setNotas(empresa?.notas ?? "");
  }, [empresa?.notas]);

  // Nueva tarea de preparación
  const [nuevaPrep, setNuevaPrep] = useState("");

  if (cargando && !empresa) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!empresa) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-12 text-center sm:px-6">
        <p className="text-sm text-muted-foreground">
          No se encontró esta empresa.
        </p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/empresas">Volver a Empresas</Link>
        </Button>
      </div>
    );
  }

  async function guardarJunta() {
    if (!empresa) return;
    if (!detalle.trim()) {
      toast.error("Escribe lo importante de la junta.");
      return;
    }
    setGuardandoJunta(true);
    try {
      const iso = new Date(`${fechaJunta}T12:00:00`).toISOString();
      await registrarActividad({
        empresaId: empresa.id,
        tipo,
        fechaHora: iso,
        descripcion: detalle.trim(),
      });
      if (proxima) {
        await actualizarProximoSeguimiento(empresa.id, proxima);
      }
      setDetalle("");
      setProxima("");
      setFechaJunta(hoyISO());
      setTipo("Junta");
      toast.success("Registro guardado");
    } finally {
      setGuardandoJunta(false);
    }
  }

  async function agregarPreparacion() {
    if (!empresa || !nuevaPrep.trim()) return;
    await crearTarea({
      empresaId: empresa.id,
      titulo: nuevaPrep.trim(),
      descripcion: "",
      estado: "pendiente",
      prioridad: "media",
      fechaLimite: empresa.fechaProximoSeguimiento,
      orden: siguienteOrden(tareas, "pendiente"),
      responsable: "",
    });
    setNuevaPrep("");
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-2 -ml-2">
          <Link href="/empresas">
            <ArrowLeft className="h-4 w-4" />
            Empresas
          </Link>
        </Button>
        <PageHeader
          title={empresa.nombre}
          subtitle="Ficha de seguimiento: juntas, pendientes y contexto."
        />
      </div>

      {/* Resumen editable */}
      <Card className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Estado</p>
          <EstadoQuickSelect
            estado={empresa.estado}
            onChange={(estado) => void cambiarEstado(empresa.id, estado)}
          />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Monto del resultado</p>
          <MontoResultadoCell empresa={empresa} onGuardar={actualizarMonto} />
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Última junta / llamada</p>
          <p className="text-sm font-medium">
            {ultimaJunta ? formatearFecha(ultimaJunta.fechaHora) : "—"}
          </p>
        </div>
        <div className="space-y-1">
          <p className="text-xs text-muted-foreground">Próxima junta</p>
          <ProximoSeguimientoCell
            empresa={empresa}
            onGuardar={actualizarProximoSeguimiento}
            onCompletar={completarProximoSeguimiento}
            ancho
          />
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          {/* Registrar junta */}
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Registrar junta</h3>
            <div className="flex flex-wrap gap-2">
              {TIPOS_JUNTA.map((t) => (
                <button
                  key={t.valor}
                  type="button"
                  onClick={() => setTipo(t.valor)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                    tipo === t.valor
                      ? "border-champagne bg-accent text-foreground"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {t.etiqueta}
                </button>
              ))}
              <Input
                type="date"
                value={fechaJunta}
                max={FECHA_MAXIMA}
                onChange={(e) => setFechaJunta(e.target.value || hoyISO())}
                className="h-7 w-auto text-xs"
                aria-label="Fecha de la junta"
              />
            </div>
            <Textarea
              value={detalle}
              onChange={(e) => setDetalle(e.target.value)}
              rows={5}
              placeholder="Lo importante de la junta: acuerdos, objeciones, decisiones, próximos pasos..."
            />
            <div className="flex flex-wrap items-end justify-between gap-2">
              <label className="text-xs text-muted-foreground">
                Próxima junta (opcional)
                <Input
                  type="date"
                  value={proxima}
                  min={hoyISO()}
                  max={FECHA_MAXIMA}
                  onChange={(e) => setProxima(e.target.value)}
                  className="mt-1 h-8 w-40"
                />
              </label>
              <Button
                onClick={guardarJunta}
                disabled={guardandoJunta || !detalle.trim()}
              >
                Guardar junta
              </Button>
            </div>
          </Card>

          {/* Historial */}
          <Card className="p-4">
            <h3 className="mb-3 text-sm font-semibold">
              Historial ({actividadesEmpresa.length})
            </h3>
            <HistorialActividades actividades={actividadesEmpresa} />
          </Card>
        </div>

        <div className="space-y-6">
          {/* Para la próxima junta */}
          <Card className="space-y-3 p-4">
            <h3 className="text-sm font-semibold">Para la próxima junta</h3>
            <p className="text-xs text-muted-foreground">
              Lo que necesitas tener listo. Aparece también en Tareas y en el
              Calendario, ligado a esta empresa.
            </p>
            <div className="flex gap-2">
              <Input
                value={nuevaPrep}
                onChange={(e) => setNuevaPrep(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") void agregarPreparacion();
                }}
                placeholder="¿Qué necesitas tener listo?"
                className="h-9"
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                aria-label="Agregar pendiente"
                disabled={procesando || !nuevaPrep.trim()}
                onClick={() => void agregarPreparacion()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <ul className="space-y-1">
              {pendientes.length === 0 && (
                <li className="py-2 text-xs text-muted-foreground">
                  Nada pendiente por ahora.
                </li>
              )}
              {pendientes.map((t) => {
                const hecha = t.estado === "hecha";
                return (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm"
                  >
                    <button
                      type="button"
                      aria-label={hecha ? "Marcar como pendiente" : "Marcar como hecha"}
                      onClick={() =>
                        void actualizarTarea(t.id, {
                          estado: hecha ? "pendiente" : "hecha",
                        })
                      }
                      className={cn(
                        "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                        hecha
                          ? "border-estado-ganada bg-estado-ganada text-white"
                          : "border-input",
                      )}
                    >
                      {hecha && <Check className="h-3.5 w-3.5" />}
                    </button>
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        hecha && "text-muted-foreground line-through",
                      )}
                    >
                      {t.titulo}
                    </span>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      aria-label="Quitar"
                      onClick={() => void eliminarTarea(t.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {/* Notas generales */}
          <Card className="space-y-2 p-4">
            <h3 className="text-sm font-semibold">Notas generales</h3>
            <Textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              onBlur={() => {
                if (empresa && notas !== empresa.notas) {
                  void actualizarNotas(empresa.id, notas);
                }
              }}
              rows={6}
              placeholder="Contexto de la cuenta, historia, personas clave, riesgos..."
            />
            <p className="text-[11px] text-muted-foreground">
              Se guarda al salir del campo.
            </p>
          </Card>

          {/* Contactos */}
          <Card className="space-y-2 p-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold">
                Contactos ({contactosEmpresa.length})
              </h3>
              <Button asChild variant="ghost" size="sm">
                <Link href="/contactos">Gestionar</Link>
              </Button>
            </div>
            {contactosEmpresa.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                Sin contactos. Agrégalos en la sección Contactos.
              </p>
            ) : (
              <ul className="space-y-1.5">
                {contactosEmpresa.map((c) => {
                  const wa = whatsapp(c.telefono);
                  return (
                    <li key={c.id} className="text-sm">
                      <p className="font-medium">
                        {c.nombre || "Sin nombre"}
                        {c.puesto && (
                          <span className="ml-1 text-xs font-normal text-muted-foreground">
                            · {c.puesto}
                          </span>
                        )}
                      </p>
                      <div className="mt-0.5 flex flex-wrap gap-1.5">
                        {c.telefono && (
                          <a
                            href={`tel:${c.telefono}`}
                            className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs"
                          >
                            <Phone className="h-3 w-3" />
                            {c.telefono}
                          </a>
                        )}
                        {wa && (
                          <a
                            href={wa}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs"
                          >
                            <MessageCircle className="h-3 w-3" />
                            WhatsApp
                          </a>
                        )}
                        {c.correo && (
                          <a
                            href={`mailto:${c.correo}`}
                            className="inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs"
                          >
                            <Mail className="h-3 w-3" />
                            {c.correo}
                          </a>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>

          <Button
            asChild
            variant="outline"
            className="w-full"
          >
            <Link href="/seguimientos">
              <CalendarClock className="h-4 w-4" />
              Ver todos los seguimientos
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
