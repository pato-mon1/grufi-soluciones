"use client";

import { Bell } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EstadoQuickSelect } from "@/components/empresas/estado-quick-select";
import { EmpresaActionsMenu } from "@/components/empresas/empresa-actions-menu";
import { ProximoSeguimientoCell } from "@/components/empresas/proximo-seguimiento-cell";
import { MontoResultadoCell } from "@/components/empresas/monto-resultado-cell";
import { RequiereSeguimientoToggle } from "@/components/empresas/requiere-seguimiento-toggle";
import { formatearFecha } from "@/lib/date";
import type { Contacto, Empresa, EstadoEmpresa } from "@/lib/types";

interface EmpresaTableProps {
  empresas: Empresa[];
  contactos: Contacto[];
  cargando: boolean;
  onVerDetalle: (empresa: Empresa) => void;
  onEditar: (empresa: Empresa) => void;
  onEliminar: (empresa: Empresa) => void;
  onMarcarSeguimiento: (empresa: Empresa) => void;
  onCambiarEstado: (id: string, estado: EstadoEmpresa) => void;
  onCambiarMonto: (id: string, monto: number | null) => void;
  onCambiarProximoSeguimiento: (id: string, fecha: string | null) => void;
  onCompletarProximoSeguimiento: (id: string, nuevaFecha: string | null) => void;
  onAlternarRequiereSeguimiento: (id: string, valor: boolean) => void;
}

const COLUMNAS = [
  "Empresa",
  "Estado",
  "Resultado",
  "Última actualización",
  "Marca",
  "Próximo seguimiento",
  "Acciones",
];

/** Texto secundario bajo el nombre: contacto principal + "+N contactos". */
function resumenContactos(
  contactos: Contacto[],
  empresaId: string,
): string | null {
  const propios = contactos.filter((c) => c.empresaId === empresaId);
  if (propios.length === 0) return null;
  const principal =
    propios.find((c) => c.principal) ?? propios[0];
  const extra = propios.length - 1;
  const nombre = principal.nombre.trim() || "Contacto";
  return extra > 0
    ? `${nombre} · +${extra} contacto${extra === 1 ? "" : "s"}`
    : nombre;
}

export function EmpresaTable(props: EmpresaTableProps) {
  const {
    empresas,
    contactos,
    cargando,
    onVerDetalle,
    onEditar,
    onEliminar,
    onMarcarSeguimiento,
    onCambiarEstado,
    onCambiarMonto,
    onCambiarProximoSeguimiento,
    onCompletarProximoSeguimiento,
    onAlternarRequiereSeguimiento,
  } = props;

  if (cargando) {
    return <TablaCargando />;
  }

  return (
    <>
      {/* Vista de tabla (tablet y escritorio) */}
      <div className="hidden md:block">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {COLUMNAS.map((columna) => (
                <TableHead
                  key={columna}
                  className={cn(
                    columna === "Acciones" && "text-right",
                    columna === "Marca" && "w-px",
                  )}
                >
                  {columna === "Marca" ? (
                    <span className="inline-flex items-center">
                      <Bell className="h-3.5 w-3.5" />
                      <span className="sr-only">
                        Marca de próximo seguimiento
                      </span>
                    </span>
                  ) : (
                    columna
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {empresas.map((empresa) => (
              <TableRow key={empresa.id} className="group">
                <TableCell className="max-w-[220px]">
                  <button
                    type="button"
                    onClick={() => onVerDetalle(empresa)}
                    className="text-left font-medium text-foreground hover:text-primary hover:underline"
                  >
                    {empresa.nombre}
                  </button>
                  {resumenContactos(contactos, empresa.id) && (
                    <p className="truncate text-xs text-muted-foreground">
                      {resumenContactos(contactos, empresa.id)}
                    </p>
                  )}
                </TableCell>
                <TableCell>
                  <EstadoQuickSelect
                    estado={empresa.estado}
                    onChange={(estado) => onCambiarEstado(empresa.id, estado)}
                  />
                </TableCell>
                <TableCell className="max-w-[240px]">
                  <MontoResultadoCell
                    empresa={empresa}
                    onGuardar={onCambiarMonto}
                  />
                </TableCell>
                <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                  {formatearFecha(empresa.fechaActualizacion)}
                </TableCell>
                <TableCell>
                  <RequiereSeguimientoToggle
                    empresa={empresa}
                    onToggle={onAlternarRequiereSeguimiento}
                  />
                </TableCell>
                <TableCell>
                  <ProximoSeguimientoCell
                    empresa={empresa}
                    onGuardar={onCambiarProximoSeguimiento}
                    onCompletar={onCompletarProximoSeguimiento}
                  />
                </TableCell>
                <TableCell className="text-right">
                  <EmpresaActionsMenu
                    empresa={empresa}
                    onVerDetalle={onVerDetalle}
                    onEditar={onEditar}
                    onMarcarSeguimiento={onMarcarSeguimiento}
                    onEliminar={onEliminar}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Vista de tarjetas (celular) */}
      <ul className="divide-y md:hidden">
        {empresas.map((empresa) => (
          <li key={empresa.id} className="flex flex-col gap-3 p-4">
            <div className="flex items-start justify-between gap-2">
              <button
                type="button"
                onClick={() => onVerDetalle(empresa)}
                className="text-left"
              >
                <p className="font-medium hover:text-primary hover:underline">
                  {empresa.nombre}
                </p>
                {resumenContactos(contactos, empresa.id) && (
                  <p className="text-xs text-muted-foreground">
                    {resumenContactos(contactos, empresa.id)}
                  </p>
                )}
              </button>
              <EmpresaActionsMenu
                empresa={empresa}
                onVerDetalle={onVerDetalle}
                onEditar={onEditar}
                onMarcarSeguimiento={onMarcarSeguimiento}
                onEliminar={onEliminar}
              />
            </div>

            <EstadoQuickSelect
              estado={empresa.estado}
              onChange={(estado) => onCambiarEstado(empresa.id, estado)}
              className="w-full"
            />

            <RequiereSeguimientoToggle
              empresa={empresa}
              onToggle={onAlternarRequiereSeguimiento}
              variante="completo"
            />

            <div className="flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">
                Resultado
              </span>
              <MontoResultadoCell
                empresa={empresa}
                onGuardar={onCambiarMonto}
                ancho
              />
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className="w-16 shrink-0 text-xs text-muted-foreground">
                Próximo
              </span>
              <ProximoSeguimientoCell
                empresa={empresa}
                onGuardar={onCambiarProximoSeguimiento}
                onCompletar={onCompletarProximoSeguimiento}
                ancho
              />
            </div>

            <p className="text-xs text-muted-foreground">
              Actualizado: {formatearFecha(empresa.fechaActualizacion)}
            </p>
          </li>
        ))}
      </ul>
    </>
  );
}

function TablaCargando() {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: 6 }).map((_, indice) => (
        <div
          key={indice}
          className="flex items-center gap-4 rounded-md border p-4"
        >
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-3 w-24" />
          </div>
          <Skeleton className="h-8 w-44" />
          <Skeleton className="hidden h-4 w-32 sm:block" />
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
}
