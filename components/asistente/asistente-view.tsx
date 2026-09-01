"use client";

import { useState } from "react";
import {
  Check,
  MessagesSquare,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { PageHeader } from "@/components/app-shell/page-header";
import { PanelChat } from "@/components/asistente/panel-chat";
import { useAsistente } from "@/lib/hooks/use-asistente";
import type { ConversacionChat } from "@/lib/asistente/tipos";

function fechaCorta(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
  }).format(d);
}

function ListaConversaciones({
  conversaciones,
  activaId,
  cargando,
  onSeleccionar,
  onNueva,
  onRenombrar,
  onEliminar,
}: {
  conversaciones: ConversacionChat[];
  activaId: string | null;
  cargando: boolean;
  onSeleccionar: (id: string) => void;
  onNueva: () => void;
  onRenombrar: (id: string, titulo: string) => void;
  onEliminar: (id: string) => void;
}) {
  const [editando, setEditando] = useState<string | null>(null);
  const [borrador, setBorrador] = useState("");
  const [aBorrar, setABorrar] = useState<ConversacionChat | null>(null);

  return (
    <div className="flex h-full min-h-0 flex-col">
      <Button
        variant="outline"
        className="mb-2 w-full justify-start"
        onClick={onNueva}
      >
        <Plus className="h-4 w-4" />
        Nueva conversación
      </Button>

      <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-1">
        {cargando && (
          <div className="space-y-1">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="h-9 animate-pulse rounded bg-muted" />
            ))}
          </div>
        )}

        {!cargando && conversaciones.length === 0 && (
          <p className="px-2 py-6 text-center text-xs text-muted-foreground">
            Aún no tienes conversaciones guardadas.
          </p>
        )}

        {conversaciones.map((c) => {
          const activa = c.id === activaId;
          if (editando === c.id) {
            return (
              <div
                key={c.id}
                className="flex items-center gap-1 rounded-md border px-1.5 py-1"
              >
                <input
                  ref={(el) => el?.focus()}
                  value={borrador}
                  onChange={(e) => setBorrador(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      onRenombrar(c.id, borrador);
                      setEditando(null);
                    }
                    if (e.key === "Escape") setEditando(null);
                  }}
                  className="min-w-0 flex-1 bg-transparent px-1 text-sm outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    onRenombrar(c.id, borrador);
                    setEditando(null);
                  }}
                  className="rounded p-1 text-exito hover:bg-accent"
                  title="Guardar"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  className="rounded p-1 text-muted-foreground hover:bg-accent"
                  title="Cancelar"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            );
          }
          return (
            <div
              key={c.id}
              className={cn(
                "group flex items-center gap-1 rounded-md px-2 py-1.5 text-sm transition-colors",
                activa
                  ? "bg-accent text-foreground"
                  : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
              )}
            >
              <button
                type="button"
                onClick={() => onSeleccionar(c.id)}
                className="flex min-w-0 flex-1 items-center gap-2 text-left"
              >
                <MessagesSquare className="h-3.5 w-3.5 shrink-0" />
                <span className="min-w-0 flex-1 truncate">{c.title}</span>
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {fechaCorta(c.updatedAt)}
                </span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBorrador(c.title);
                  setEditando(c.id);
                }}
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-card group-hover:opacity-100"
                title="Cambiar el nombre"
              >
                <Pencil className="h-3 w-3" />
              </button>
              <button
                type="button"
                onClick={() => setABorrar(c)}
                className="rounded p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-card hover:text-destructive group-hover:opacity-100"
                title="Eliminar"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      <Dialog open={aBorrar !== null} onOpenChange={(v) => !v && setABorrar(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Eliminar conversación</DialogTitle>
            <DialogDescription>
              Se eliminará esta conversación y sus mensajes. Esta acción no se
              puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setABorrar(null)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (aBorrar) onEliminar(aBorrar.id);
                setABorrar(null);
              }}
            >
              Eliminar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AsistenteView() {
  const asistente = useAsistente();
  const [drawerLista, setDrawerLista] = useState(false);

  const lista = (
    <ListaConversaciones
      conversaciones={asistente.conversaciones}
      activaId={asistente.activaId}
      cargando={asistente.cargandoLista}
      onSeleccionar={(id) => {
        void asistente.seleccionar(id);
        setDrawerLista(false);
      }}
      onNueva={() => {
        asistente.nueva();
        setDrawerLista(false);
      }}
      onRenombrar={asistente.renombrar}
      onEliminar={(id) => void asistente.eliminar(id)}
    />
  );

  if (!asistente.disponible) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <PageHeader
          title="Asistente GRUFI"
          subtitle="Consulta proyectos, tareas, seguimientos y resultados"
        />
        <Card className="mt-6 p-6 text-sm text-muted-foreground">
          El Asistente GRUFI requiere el modo Nube (Supabase). En modo Local no
          hay datos centralizados que consultar.
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto flex h-[calc(100dvh-7rem)] w-full max-w-6xl flex-col px-4 py-4 sm:px-6 lg:h-[calc(100dvh-5.5rem)]">
      <div className="flex items-start justify-between gap-3">
        <PageHeader
          title="Asistente GRUFI"
          subtitle="Consulta proyectos, tareas, seguimientos y resultados"
        />
        <Button
          variant="outline"
          size="sm"
          className="lg:hidden"
          onClick={() => setDrawerLista(true)}
        >
          <MessagesSquare className="h-4 w-4" />
          Conversaciones
        </Button>
      </div>

      <div className="mt-4 flex min-h-0 flex-1 gap-4">
        <aside className="hidden w-64 shrink-0 lg:block">{lista}</aside>
        <Card className="flex min-h-0 flex-1 flex-col overflow-hidden p-0">
          <PanelChat asistente={asistente} modo="pagina" />
        </Card>
      </div>

      <Sheet open={drawerLista} onOpenChange={setDrawerLista}>
        <SheetContent side="left" className="w-80 p-0">
          <SheetHeader className="border-b p-4 text-left">
            <SheetTitle>Conversaciones</SheetTitle>
          </SheetHeader>
          <div className="h-[calc(100%-4rem)] p-3">{lista}</div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
