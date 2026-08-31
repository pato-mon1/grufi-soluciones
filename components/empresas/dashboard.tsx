"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Plus, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { PageHeader } from "@/components/app-shell/page-header";
import {
  SummaryCards,
  type IdTarjetaResumen,
} from "@/components/empresas/summary-cards";
import { Toolbar } from "@/components/empresas/toolbar";
import { EmpresaTable } from "@/components/empresas/empresa-table";
import { EmptyState } from "@/components/empresas/empty-state";
import { EmpresaFormSheet } from "@/components/empresas/empresa-form-sheet";
import { EmpresaDetailSheet } from "@/components/empresas/empresa-detail-sheet";
import { DeleteEmpresaDialog } from "@/components/empresas/delete-empresa-dialog";
import { SeguimientoDialog } from "@/components/empresas/seguimiento-dialog";
import { RegistrarActividadDialog } from "@/components/empresas/registrar-actividad-dialog";
import { MigrarSupabaseDialog } from "@/components/empresas/migrar-supabase-dialog";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { calcularResumen, filtrarYOrdenar, type OpcionesFiltro } from "@/lib/filtros";
import { csvAEmpresas, descargarCSV, empresasACSV } from "@/lib/csv";
import { hoyISO } from "@/lib/date";
import { ORDEN_PREDETERMINADO } from "@/lib/constants";
import type { BorradorContacto, Empresa } from "@/lib/types";

const OPCIONES_INICIALES: OpcionesFiltro = {
  busqueda: "",
  estado: "todos",
  soloPendientes: false,
  soloMarcadas: false,
  // Orden predeterminado: prioridad por grupos de seguimiento, A-Z dentro de cada grupo.
  orden: ORDEN_PREDETERMINADO,
  direccion: "asc",
};

/** Estados que tienen una tarjeta de resumen dedicada. */
const ESTADOS_CON_TARJETA = new Set<string>([
  "Pendiente",
  "En pláticas",
  "En avance",
  "Cerrada - Ganada",
]);

export function Dashboard() {
  const {
    empresas,
    contactos,
    actividades,
    cargando,
    procesando,
    error,
    importacionPendiente,
    importarLocalesASupabase,
    continuarEnModoLocal,
    recargar,
    agregar,
    editar,
    cambiarEstado,
    actualizarNotas,
    actualizarMonto,
    actualizarProximoSeguimiento,
    completarProximoSeguimiento,
    alternarRequiereSeguimiento,
    marcarSeguimiento,
    eliminar,
    importar,
    sincronizarContactos,
    registrarActividad,
  } = useEmpresas();

  const [opciones, setOpciones] = useState<OpcionesFiltro>(OPCIONES_INICIALES);

  const [formAbierto, setFormAbierto] = useState(false);
  const [empresaEditar, setEmpresaEditar] = useState<Empresa | null>(null);
  const [detalleId, setDetalleId] = useState<string | null>(null);
  const [seguimientoId, setSeguimientoId] = useState<string | null>(null);
  const [empresaEliminar, setEmpresaEliminar] = useState<Empresa | null>(null);
  const [actividadEmpresa, setActividadEmpresa] = useState<Empresa | null>(null);

  const empresasFiltradas = useMemo(
    () => filtrarYOrdenar(empresas, opciones),
    [empresas, opciones],
  );

  const resumen = useMemo(() => calcularResumen(empresas), [empresas]);

  const detalleEmpresa = detalleId
    ? (empresas.find((e) => e.id === detalleId) ?? null)
    : null;
  const seguimientoEmpresa = seguimientoId
    ? (empresas.find((e) => e.id === seguimientoId) ?? null)
    : null;

  /** Contactos de la empresa en edición, como borradores para el formulario. */
  const contactosIniciales = useMemo<BorradorContacto[]>(() => {
    if (!empresaEditar) return [];
    return contactos
      .filter((c) => c.empresaId === empresaEditar.id)
      .sort((a, b) => Number(b.principal) - Number(a.principal))
      .map((c) => ({
        id: c.id,
        nombre: c.nombre,
        puesto: c.puesto,
        telefono: c.telefono,
        correo: c.correo,
        principal: c.principal,
      }));
  }, [empresaEditar, contactos]);

  const hayFiltrosActivos =
    opciones.busqueda !== "" ||
    opciones.estado !== "todos" ||
    opciones.soloPendientes ||
    opciones.soloMarcadas;

  /** Tarjeta de resumen cuyo filtro coincide con el estado actual (o `null`). */
  const tarjetaActiva: IdTarjetaResumen | null = useMemo(() => {
    if (opciones.soloPendientes) return null;
    if (opciones.soloMarcadas) {
      return opciones.estado === "todos" ? "marcadas" : null;
    }
    if (opciones.estado === "todos") return "total";
    // Solo 4 estados tienen tarjeta; los demás no resaltan ninguna.
    return ESTADOS_CON_TARJETA.has(opciones.estado)
      ? (opciones.estado as IdTarjetaResumen)
      : null;
  }, [opciones.soloPendientes, opciones.soloMarcadas, opciones.estado]);

  /**
   * Al pulsar una tarjeta: limpia la búsqueda y los filtros incompatibles y
   * aplica solo el de la tarjeta. Conserva el orden actual. Volver a pulsar la
   * tarjeta activa (o pulsar "Total de empresas") regresa a "todas".
   */
  function seleccionarTarjeta(id: IdTarjetaResumen) {
    const volverATodas = id === "total" || tarjetaActiva === id;
    setOpciones((prev) => ({
      ...prev,
      busqueda: "",
      soloPendientes: false,
      soloMarcadas: !volverATodas && id === "marcadas",
      estado: !volverATodas && id !== "marcadas" ? id : "todos",
    }));
  }

  function abrirNueva() {
    setEmpresaEditar(null);
    setFormAbierto(true);
  }

  function abrirEdicion(empresa: Empresa) {
    setDetalleId(null);
    setEmpresaEditar(empresa);
    setFormAbierto(true);
  }

  function abrirSeguimiento(empresa: Empresa) {
    setDetalleId(null);
    setSeguimientoId(empresa.id);
  }

  function solicitarEliminar(empresa: Empresa) {
    setDetalleId(null);
    setEmpresaEliminar(empresa);
  }

  function exportar() {
    if (empresas.length === 0) {
      toast.warning("No hay empresas para exportar.");
      return;
    }
    descargarCSV(
      empresasACSV(empresas, contactos),
      `seguimiento-empresas-${hoyISO()}.csv`,
    );
    toast.success("Archivo CSV generado");
  }

  async function importarArchivo(archivo: File) {
    try {
      const texto = await archivo.text();
      const {
        empresas: nuevas,
        contactosPorEmpresa,
        omitidas,
      } = csvAEmpresas(texto);
      if (nuevas.length === 0) {
        toast.error("No se encontraron empresas válidas en el archivo.");
        return;
      }
      const total = await importar(nuevas, contactosPorEmpresa);
      if (total > 0 && omitidas > 0) {
        toast.info(`Se omitieron ${omitidas} fila(s) sin nombre de empresa.`);
      }
    } catch {
      toast.error("No se pudo leer el archivo CSV.");
    }
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Empresas"
        subtitle="Administra y consulta el avance de cada oportunidad"
        action={
          <Button onClick={abrirNueva} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 text-champagne" />
            Agregar empresa
          </Button>
        }
      />

      <SummaryCards
        empresas={empresas}
        cargando={cargando}
        tarjetaActiva={tarjetaActiva}
        onSeleccionar={seleccionarTarjeta}
      />

      <Card className="overflow-hidden">
        <div className="border-b p-4">
          <Toolbar
            opciones={opciones}
            onOpcionesChange={setOpciones}
            onImportar={importarArchivo}
            onExportar={exportar}
            pendientesSeguimiento={resumen.seguimientoPendiente}
            marcadasSeguimiento={resumen.marcadasSeguimiento}
            deshabilitado={cargando || procesando}
          />
        </div>

        {error ? (
          <div className="flex flex-col items-center gap-3 px-6 py-16 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10">
              <AlertCircle className="h-6 w-6 text-destructive" />
            </div>
            <div className="space-y-1">
              <p className="font-medium">No se pudieron cargar los datos</p>
              <p className="max-w-sm text-sm text-muted-foreground">{error}</p>
            </div>
            <Button variant="outline" size="sm" onClick={() => void recargar()}>
              <RotateCw className="h-4 w-4" />
              Reintentar
            </Button>
          </div>
        ) : cargando ? (
          <EmpresaTable
            empresas={[]}
            contactos={[]}
            cargando
            onVerDetalle={() => {}}
            onEditar={() => {}}
            onEliminar={() => {}}
            onMarcarSeguimiento={() => {}}
            onCambiarEstado={() => {}}
            onCambiarMonto={() => {}}
            onCambiarProximoSeguimiento={() => {}}
            onCompletarProximoSeguimiento={() => {}}
            onAlternarRequiereSeguimiento={() => {}}
          />
        ) : empresas.length === 0 ? (
          <EmptyState variante="sin-datos" onAgregar={abrirNueva} />
        ) : empresasFiltradas.length === 0 ? (
          <EmptyState
            variante="sin-resultados"
            onLimpiarFiltros={() =>
              setOpciones((prev) => ({
                ...OPCIONES_INICIALES,
                orden: prev.orden,
                direccion: prev.direccion,
              }))
            }
          />
        ) : (
          <>
            <EmpresaTable
              empresas={empresasFiltradas}
              contactos={contactos}
              cargando={false}
              onVerDetalle={(e) => setDetalleId(e.id)}
              onEditar={abrirEdicion}
              onEliminar={solicitarEliminar}
              onMarcarSeguimiento={abrirSeguimiento}
              onCambiarEstado={cambiarEstado}
              onCambiarMonto={actualizarMonto}
              onCambiarProximoSeguimiento={actualizarProximoSeguimiento}
              onCompletarProximoSeguimiento={completarProximoSeguimiento}
              onAlternarRequiereSeguimiento={alternarRequiereSeguimiento}
            />
            <div className="border-t px-4 py-2.5 text-xs text-muted-foreground">
              Mostrando {empresasFiltradas.length} de {empresas.length} empresa
              {empresas.length === 1 ? "" : "s"}
              {hayFiltrosActivos && " (filtro aplicado)"}
            </div>
          </>
        )}
      </Card>

      {/* Formulario alta / edición */}
      <EmpresaFormSheet
        abierto={formAbierto}
        onOpenChange={setFormAbierto}
        empresa={empresaEditar}
        contactosIniciales={contactosIniciales}
        procesando={procesando}
        onGuardar={(input) =>
          empresaEditar ? editar(empresaEditar.id, input) : agregar(input)
        }
        onSincronizarContactos={sincronizarContactos}
      />

      {/* Detalle */}
      {detalleEmpresa && (
        <EmpresaDetailSheet
          empresa={detalleEmpresa}
          contactos={contactos}
          actividades={actividades}
          onOpenChange={(v) => !v && setDetalleId(null)}
          onEditar={abrirEdicion}
          onEliminar={solicitarEliminar}
          onMarcarSeguimiento={abrirSeguimiento}
          onRegistrarActividad={(e) => setActividadEmpresa(e)}
          onGuardarNotas={actualizarNotas}
          onGuardarMonto={actualizarMonto}
        />
      )}

      {/* Confirmación de borrado */}
      <DeleteEmpresaDialog
        empresa={empresaEliminar}
        onOpenChange={(v) => !v && setEmpresaEliminar(null)}
        onConfirmar={eliminar}
      />

      {/* Marcar seguimiento realizado */}
      <SeguimientoDialog
        empresa={seguimientoEmpresa}
        onOpenChange={(v) => !v && setSeguimientoId(null)}
        onConfirmar={marcarSeguimiento}
        procesando={procesando}
      />

      {/* Registrar actividad manual */}
      <RegistrarActividadDialog
        empresa={actividadEmpresa}
        onOpenChange={(v) => !v && setActividadEmpresa(null)}
        onGuardar={registrarActividad}
        procesando={procesando}
      />

      {/* Migración de datos locales a Supabase */}
      <MigrarSupabaseDialog
        cantidad={importacionPendiente}
        procesando={procesando}
        onImportar={() => void importarLocalesASupabase()}
        onContinuarLocal={continuarEnModoLocal}
      />
    </div>
  );
}
