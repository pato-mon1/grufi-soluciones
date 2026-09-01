"use client";

import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { MiembroEquipo } from "@/lib/types";

export function iniciales(nombre: string): string {
  const partes = nombre.trim().split(/\s+/).filter(Boolean);
  if (partes.length === 0) return "?";
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

const COLORES_AVATAR = [
  "bg-estado-avance/15 text-estado-avance-fg",
  "bg-estado-ganada/15 text-estado-ganada-fg",
  "bg-estado-platicas-suave text-estado-platicas-fg",
  "bg-estado-futura-suave text-estado-futura-fg",
  "bg-seguimiento/15 text-foreground",
];

function colorAvatar(userId: string): string {
  let h = 0;
  for (let i = 0; i < userId.length; i++) h = (h * 31 + userId.charCodeAt(i)) | 0;
  return COLORES_AVATAR[Math.abs(h) % COLORES_AVATAR.length];
}

export function Avatar({
  nombre,
  userId,
  className,
}: {
  nombre: string;
  userId: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold",
        colorAvatar(userId),
        className,
      )}
      aria-hidden
    >
      {iniciales(nombre)}
    </span>
  );
}

/**
 * Selector de responsable a partir de los perfiles del equipo.
 * No permite texto libre.
 */
export function SelectorUsuario({
  valor,
  miembros,
  onChange,
  permitirVacio = true,
  id,
  disabled,
}: {
  valor: string | null;
  miembros: MiembroEquipo[];
  onChange: (userId: string | null) => void;
  permitirVacio?: boolean;
  id?: string;
  disabled?: boolean;
}) {
  return (
    <Select
      value={valor ?? "__nadie__"}
      onValueChange={(v) => onChange(v === "__nadie__" ? null : v)}
      disabled={disabled}
    >
      <SelectTrigger id={id} aria-label="Responsable">
        <SelectValue placeholder="Sin asignar" />
      </SelectTrigger>
      <SelectContent>
        {permitirVacio && (
          <SelectItem value="__nadie__">Sin asignar</SelectItem>
        )}
        {miembros.map((m) => (
          <SelectItem key={m.userId} value={m.userId}>
            <span className="flex items-center gap-2">
              <Avatar nombre={m.nombre} userId={m.userId} />
              {m.nombre}
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
