"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";
import { usandoSupabase } from "@/lib/repository";
import { usePermisos } from "@/lib/hooks/use-permisos";
import { useAsistente } from "@/lib/hooks/use-asistente";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PanelChat } from "@/components/asistente/panel-chat";

/** Botón flotante para abrir el Asistente GRUFI desde cualquier panel. */
export function BotonFlotanteAsistente() {
  const pathname = usePathname();
  const { cargando, puede } = usePermisos();

  const enPaginaAsistente =
    pathname === "/asistente" || pathname.startsWith("/asistente/");

  if (
    !usandoSupabase() ||
    enPaginaAsistente ||
    cargando ||
    !puede("asistente", "view")
  ) {
    return null;
  }
  return <FabInterno />;
}

function FabInterno() {
  const [abierto, setAbierto] = useState(false);
  const asistente = useAsistente();

  return (
    <>
      <button
        type="button"
        onClick={() => setAbierto(true)}
        aria-label="Abrir Asistente GRUFI"
        className="fixed bottom-4 right-4 z-40 flex h-12 w-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-105 hover:bg-primary/90 active:scale-95 sm:bottom-6 sm:right-6"
      >
        <Sparkles className="h-5 w-5" />
      </button>

      <Sheet open={abierto} onOpenChange={setAbierto}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md"
        >
          <SheetHeader className="flex-row items-center justify-between space-y-0 border-b p-3 pr-12 text-left">
            <SheetTitle className="flex items-center gap-2 text-base">
              <Sparkles className="h-4 w-4 text-champagne" />
              Asistente GRUFI
            </SheetTitle>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Nueva conversación"
                onClick={() => asistente.nueva()}
              >
                <Plus className="h-4 w-4" />
              </Button>
              <Button
                asChild
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                title="Abrir el apartado completo"
              >
                <Link href="/asistente" onClick={() => setAbierto(false)}>
                  <ArrowUpRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <PanelChat asistente={asistente} modo="flotante" />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
