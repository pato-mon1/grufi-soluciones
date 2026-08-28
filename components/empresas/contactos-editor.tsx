"use client";

import { useState } from "react";
import { Pencil, Phone, Plus, Star, Trash2, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/empresas/field";
import {
  correoValido,
  telefonoValido,
  validarContacto,
} from "@/lib/validation";
import type { BorradorContacto } from "@/lib/types";

interface ContactosEditorProps {
  contactos: BorradorContacto[];
  onChange: (contactos: BorradorContacto[]) => void;
}

const VACIO: BorradorContacto = {
  nombre: "",
  puesto: "",
  telefono: "",
  correo: "",
  principal: false,
};

/** Sección "Contactos" del formulario de empresa: agregar / editar / eliminar. */
export function ContactosEditor({ contactos, onChange }: ContactosEditorProps) {
  const [editandoIdx, setEditandoIdx] = useState<number | null>(null);
  const [borrador, setBorrador] = useState<BorradorContacto>(VACIO);
  const [errores, setErrores] = useState<
    Partial<Record<keyof BorradorContacto, string>>
  >({});

  function abrirNuevo() {
    setBorrador({ ...VACIO, principal: contactos.length === 0 });
    setErrores({});
    setEditandoIdx(-1);
  }

  function abrirEdicion(idx: number) {
    setBorrador({ ...contactos[idx] });
    setErrores({});
    setEditandoIdx(idx);
  }

  function cancelar() {
    setEditandoIdx(null);
    setErrores({});
  }

  function guardar() {
    const errs = validarContacto(borrador);
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    let lista = [...contactos];
    const limpio: BorradorContacto = {
      ...borrador,
      nombre: borrador.nombre.trim(),
      puesto: borrador.puesto.trim(),
      telefono: borrador.telefono.trim(),
      correo: borrador.correo.trim(),
    };
    if (editandoIdx === -1) lista.push(limpio);
    else if (editandoIdx !== null) lista[editandoIdx] = limpio;

    // Un solo principal.
    if (limpio.principal) {
      const objetivo = editandoIdx === -1 ? lista.length - 1 : editandoIdx;
      lista = lista.map((c, i) =>
        i === objetivo ? c : { ...c, principal: false },
      );
    }
    // Si no queda ninguno principal, el primero lo es.
    if (lista.length > 0 && !lista.some((c) => c.principal)) {
      lista[0] = { ...lista[0], principal: true };
    }
    onChange(lista);
    cancelar();
  }

  function eliminar(idx: number) {
    const lista = contactos.filter((_, i) => i !== idx);
    if (lista.length > 0 && !lista.some((c) => c.principal)) {
      lista[0] = { ...lista[0], principal: true };
    }
    onChange(lista);
  }

  function marcarPrincipal(idx: number) {
    onChange(contactos.map((c, i) => ({ ...c, principal: i === idx })));
  }

  const formAbierto = editandoIdx !== null;

  return (
    <div className="space-y-3">
      {contactos.length === 0 && !formAbierto && (
        <p className="text-xs text-muted-foreground">
          Sin contactos. Puedes agregar uno o dejar la empresa sin contactos.
        </p>
      )}

      <ul className="space-y-2">
        {contactos.map((c, idx) => (
          <li
            key={c.id ?? `nuevo-${idx}`}
            className="rounded-md border bg-card p-3 text-sm shadow-card"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="flex items-center gap-1.5 font-medium">
                  <UserRound className="h-3.5 w-3.5 text-muted-foreground" />
                  {c.nombre || "Contacto sin nombre"}
                  {c.principal && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-champagne/15 px-1.5 py-0.5 text-[10px] font-medium text-estado-futura-fg">
                      <Star className="h-2.5 w-2.5 fill-champagne text-champagne" />
                      Principal
                    </span>
                  )}
                </p>
                {c.puesto && (
                  <p className="text-xs text-muted-foreground">{c.puesto}</p>
                )}
                <p className="mt-0.5 truncate text-xs text-muted-foreground">
                  {[c.telefono, c.correo].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                {!c.principal && (
                  <button
                    type="button"
                    onClick={() => marcarPrincipal(idx)}
                    title="Marcar como principal"
                    className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-champagne"
                  >
                    <Star className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => abrirEdicion(idx)}
                  title="Editar contacto"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => eliminar(idx)}
                  title="Eliminar contacto"
                  className="flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </li>
        ))}
      </ul>

      {formAbierto ? (
        <div className="space-y-3 rounded-md border bg-muted/40 p-3">
          <Field
            id="c-nombre"
            label="Nombre"
            requerido
            error={errores.nombre}
          >
            <Input
              id="c-nombre"
              value={borrador.nombre}
              onChange={(e) =>
                setBorrador((b) => ({ ...b, nombre: e.target.value }))
              }
              autoComplete="off"
              autoFocus
            />
          </Field>
          <Field id="c-puesto" label="Puesto o cargo">
            <Input
              id="c-puesto"
              value={borrador.puesto}
              onChange={(e) =>
                setBorrador((b) => ({ ...b, puesto: e.target.value }))
              }
              autoComplete="off"
            />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="c-telefono" label="Teléfono" error={errores.telefono}>
              <Input
                id="c-telefono"
                type="tel"
                inputMode="tel"
                value={borrador.telefono}
                onChange={(e) =>
                  setBorrador((b) => ({ ...b, telefono: e.target.value }))
                }
                aria-invalid={
                  Boolean(errores.telefono) || !telefonoValido(borrador.telefono)
                }
              />
            </Field>
            <Field id="c-correo" label="Correo" error={errores.correo}>
              <Input
                id="c-correo"
                type="email"
                value={borrador.correo}
                onChange={(e) =>
                  setBorrador((b) => ({ ...b, correo: e.target.value }))
                }
                aria-invalid={
                  Boolean(errores.correo) || !correoValido(borrador.correo)
                }
              />
            </Field>
          </div>
          <label className="flex cursor-pointer items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={borrador.principal}
              onChange={(e) =>
                setBorrador((b) => ({ ...b, principal: e.target.checked }))
              }
              className={cn(
                "h-4 w-4 rounded border-input accent-champagne",
              )}
            />
            Contacto principal
          </label>
          <div className="flex gap-2">
            <Button type="button" size="sm" onClick={guardar}>
              {editandoIdx === -1 ? "Agregar contacto" : "Guardar contacto"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={cancelar}
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={abrirNuevo}
          className="w-full"
        >
          <Plus className="h-4 w-4" />
          Agregar contacto
        </Button>
      )}

      {contactos.some((c) => c.telefono) && (
        <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Phone className="h-3 w-3" />
          Se validan el formato de teléfono y correo.
        </p>
      )}
    </div>
  );
}
