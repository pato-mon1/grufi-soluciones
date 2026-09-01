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
import { SelectorUsuario } from "@/components/tareas/selector-usuario";
import { fechaEnZona, horaEnZona, muroAUtcISO } from "@/lib/zona";
import {
  COLUMNAS_TAREA,
  ETIQUETA_PRIORIDAD,
} from "@/lib/tareas";
import {
  PRIORIDADES_TAREA,
  type Contacto,
  type EstadoTarea,
  type MiembroEquipo,
  type PrioridadTarea,
  type Tarea,
  type TareaInput,
} from "@/lib/types";

const ZONA = "America/Monterrey";

interface Preset {
  estado?: EstadoTarea;
  empresaId?: string | null;
  asignadoA?: string | null;
}

function vacio(preset?: Preset): TareaInput {
  return {
    empresaId: preset?.empresaId ?? null,
    contactoId: null,
    titulo: "",
    descripcion: "",
    estado: preset?.estado ?? "por_hacer",
    prioridad: "media",
    asignadoA: preset?.asignadoA ?? null,
    venceEn: null,
    fechaLimite: null,
    progreso: 0,
    orden: 0,
    responsable: "",
  };
}

export function TareaFormDialog({
  abierto,
  tarea,
  preset,
  empresas,
  contactos,
  miembros,
  procesando,
  onOpenChange,
  onGuardar,
}: {
  abierto: boolean;
  tarea: Tarea | null;
  preset?: Preset;
  empresas: { id: string; nombre: string }[];
  contactos: Contacto[];
  miembros: MiembroEquipo[];
  procesando: boolean;
  onOpenChange: (v: boolean) => void;
  onGuardar: (datos: TareaInput) => Promise<void>;
}) {
  const editando = tarea !== null;
  const [datos, setDatos] = useState<TareaInput>(vacio(preset));
  const [fecha, setFecha] = useState("");
  const [hora, setHora] = useState("");
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!abierto) return;
    setError(undefined);
    if (tarea) {
      setDatos({
        empresaId: tarea.empresaId,
        contactoId: tarea.contactoId,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion,
        estado: tarea.estado,
        prioridad: tarea.prioridad,
        asignadoA: tarea.asignadoA,
        venceEn: tarea.venceEn,
        fechaLimite: tarea.fechaLimite,
        progreso: tarea.progreso,
        orden: tarea.orden,
        responsable: tarea.responsable,
      });
      if (tarea.venceEn) {
        setFecha(fechaEnZona(tarea.venceEn, ZONA));
        setHora(horaEnZona(tarea.venceEn, ZONA));
      } else {
        setFecha(tarea.fechaLimite ?? "");
        setHora("");
      }
    } else {
      setDatos(vacio(preset));
      setFecha("");
      setHora("");
    }
  }, [abierto, tarea, preset]);

  function set<K extends keyof TareaInput>(k: K, v: TareaInput[K]) {
    setDatos((p) => ({ ...p, [k]: v }));
  }

  const contactosEmpresa = datos.empresaId
    ? contactos.filter((c) => c.empresaId === datos.empresaId)
    : [];
  const nombreResp =
    miembros.find((m) => m.userId === datos.asignadoA)?.nombre ?? "";

  async function enviar() {
    if (!datos.titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    let venceEn: string | null = null;
    let fechaLimite: string | null = null;
    if (fecha) {
      venceEn = muroAUtcISO(fecha, hora || "18:00", ZONA);
      fechaLimite = fecha;
    }
    await onGuardar({
      ...datos,
      titulo: datos.titulo.trim(),
      venceEn,
      fechaLimite,
      responsable: nombreResp,
    });
  }

  return (
    <Dialog open={abierto} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editando ? "Editar tarea" : "Nueva tarea"}</DialogTitle>
          <DialogDescription>
            Asigna la tarea a una persona del equipo y define su fecha límite.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Field id="tf-titulo" label="Título" requerido error={error}>
            <Input
              id="tf-titulo"
              value={datos.titulo}
              onChange={(e) => set("titulo", e.target.value)}
              autoComplete="off"
            />
          </Field>

          <Field id="tf-desc" label="Descripción">
            <Textarea
              id="tf-desc"
              rows={3}
              value={datos.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
            />
          </Field>

          <Field id="tf-resp" label="Responsable">
            <SelectorUsuario
              id="tf-resp"
              valor={datos.asignadoA}
              miembros={miembros}
              onChange={(u) => set("asignadoA", u)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field id="tf-estado" label="Estado">
              <Select
                value={datos.estado}
                onValueChange={(v) => set("estado", v as EstadoTarea)}
              >
                <SelectTrigger id="tf-estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COLUMNAS_TAREA.map((c) => (
                    <SelectItem key={c.estado} value={c.estado}>
                      {c.etiqueta}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="tf-prio" label="Prioridad">
              <Select
                value={datos.prioridad}
                onValueChange={(v) => set("prioridad", v as PrioridadTarea)}
              >
                <SelectTrigger id="tf-prio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES_TAREA.map((p) => (
                    <SelectItem key={p} value={p}>
                      {ETIQUETA_PRIORIDAD[p]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field id="tf-fecha" label="Fecha límite">
              <Input
                id="tf-fecha"
                type="date"
                value={fecha}
                max="2035-12-31"
                onChange={(e) => setFecha(e.target.value)}
              />
            </Field>
            <Field id="tf-hora" label="Hora límite">
              <Input
                id="tf-hora"
                type="time"
                value={hora}
                disabled={!fecha}
                onChange={(e) => setHora(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Field id="tf-empresa" label="Empresa">
              <Select
                value={datos.empresaId ?? "__ninguna__"}
                onValueChange={(v) => {
                  set("empresaId", v === "__ninguna__" ? null : v);
                  set("contactoId", null);
                }}
              >
                <SelectTrigger id="tf-empresa">
                  <SelectValue placeholder="Ninguna" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ninguna__">Ninguna</SelectItem>
                  {empresas.map((e) => (
                    <SelectItem key={e.id} value={e.id}>
                      {e.nombre}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="tf-contacto" label="Contacto">
              <Select
                value={datos.contactoId ?? "__ninguno__"}
                onValueChange={(v) =>
                  set("contactoId", v === "__ninguno__" ? null : v)
                }
                disabled={!datos.empresaId || contactosEmpresa.length === 0}
              >
                <SelectTrigger id="tf-contacto">
                  <SelectValue placeholder="Ninguno" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__ninguno__">Ninguno</SelectItem>
                  {contactosEmpresa.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nombre || "Sin nombre"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
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
            {editando ? "Guardar cambios" : "Crear tarea"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
