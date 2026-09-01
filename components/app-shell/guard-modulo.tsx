"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { usePermisos } from "@/lib/hooks/use-permisos";
import {
  moduloDeRuta,
  primeraRutaPermitida,
  tieneAcceso,
} from "@/lib/permisos";

/** Envuelve el contenido de cada página y bloquea los módulos sin acceso. */
export function GuardModulo({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { cargando, esAdmin, permisos } = usePermisos();
  const modulo = moduloDeRuta(pathname);

  if (!modulo) return <>{children}</>;

  if (cargando) {
    return (
      <div className="mx-auto w-full max-w-5xl space-y-4 px-4 py-8 sm:px-6">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (esAdmin || tieneAcceso(permisos[modulo], "view")) {
    return <>{children}</>;
  }

  const destino = primeraRutaPermitida(permisos);
  return (
    <div className="mx-auto flex w-full max-w-md flex-col items-center px-4 py-20 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-estado-perdida/12">
        <ShieldX className="h-6 w-6 text-estado-perdida" />
      </span>
      <h1 className="mt-4 text-lg font-semibold">
        No tienes acceso a este apartado
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Pide a un administrador que te dé acceso a “{modulo}” si lo necesitas.
      </p>
      <Button asChild className="mt-5">
        <Link href={destino}>Ir a mi primer panel</Link>
      </Button>
    </div>
  );
}
