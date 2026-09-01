"use client";

import Link from "next/link";
import {
  Activity,
  Building2,
  CalendarClock,
  CalendarDays,
  ListChecks,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";
import type { FuenteConsultada } from "@/lib/asistente/tipos";

const ICONO: Record<FuenteConsultada["tipo"], LucideIcon> = {
  proyecto: Building2,
  empresa: Building2,
  tareas: ListChecks,
  seguimientos: CalendarClock,
  finanzas: Wallet,
  calendario: CalendarDays,
  contactos: Users,
  actividad: Activity,
};

export function Fuentes({ fuentes }: { fuentes: FuenteConsultada[] }) {
  if (!fuentes || fuentes.length === 0) return null;
  return (
    <div className="mt-3 border-t pt-2.5">
      <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        Fuentes consultadas
      </p>
      <div className="flex flex-wrap gap-1.5">
        {fuentes.map((f, i) => {
          const Icono = ICONO[f.tipo] ?? Building2;
          return (
            <Link
              key={`${f.href}-${i}`}
              href={f.href}
              className="inline-flex items-center gap-1.5 rounded-full border bg-card px-2.5 py-1 text-xs text-foreground transition-colors hover:border-champagne hover:bg-accent/50"
            >
              <Icono className="h-3.5 w-3.5 text-champagne" />
              <span className="max-w-[220px] truncate">{f.etiqueta}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
