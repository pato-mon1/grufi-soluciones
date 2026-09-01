"use client";

import { useEffect, useState } from "react";
import { Mail, ShieldCheck, UserPlus, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/empresas/field";
import {
  MatrizPermisos,
  ResumenPermisos,
} from "@/components/configuracion/matriz-permisos";
import { useEquipo } from "@/lib/hooks/use-equipo";
import { formatearFechaHora } from "@/lib/date";
import {
  MODULOS,
  PERMISOS_VACIOS,
  PLANTILLA_LABEL,
  plantillaDeRol,
  tieneAcceso,
  type MapaPermisos,
} from "@/lib/permisos";
import type { MiembroOrg } from "@/lib/equipo";

const ROLES_GENERAL = [
  "admin",
  "ventas",
  "finanzas",
  "colaborador",
  "personalizado",
] as const;

const ESTADO_CLASE: Record<string, string> = {
  activo: "bg-estado-ganada/12 text-estado-ganada-fg",
  inactivo: "bg-muted text-muted-foreground",
  pendiente: "bg-estado-platicas-suave text-estado-platicas-fg",
};

function resumenPaneles(p: MapaPermisos): string {
  const n = MODULOS.filter((m) => tieneAcceso(p[m], "view")).length;
  if (n === MODULOS.length) return "Todos los paneles";
  if (n === 0) return "Ningún panel";
  return `${n} de ${MODULOS.length} paneles`;
}

export function EquipoPermisos() {
  const eq = useEquipo();
  const [nombreOrg, setNombreOrg] = useState("");
  const [panel, setPanel] = useState<
    | { modo: "nuevo" }
    | { modo: "editar"; miembro: MiembroOrg }
    | null
  >(null);
  const [criticoPend, setCriticoPend] = useState<null | {
    userId: string;
    perfil: { nombre: string; puesto: string; estado: string; rolGeneral: string };
    permisos: MapaPermisos;
  }>(null);

  useEffect(() => {
    setNombreOrg(eq.organizacion?.nombre ?? "");
  }, [eq.organizacion]);

  if (!eq.disponible) {
    return (
      <Card className="space-y-2 p-5">
        <h2 className="text-sm font-semibold">Equipo y permisos</h2>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Users className="h-4 w-4" />
          Requiere el modo Nube (Supabase). En modo Local no hay usuarios.
        </p>
      </Card>
    );
  }

  const totalAdmins = eq.miembros.filter(
    (m) => m.rol === "admin" || m.rolGeneral === "admin",
  ).length;

  async function guardarColaborador(datos: {
    userId?: string;
    correo: string;
    nombre: string;
    puesto: string;
    rolGeneral: string;
    estado: string;
    permisos: MapaPermisos;
  }) {
    if (datos.userId) {
      await eq.guardarPerfilColaborador(datos.userId, {
        nombre: datos.nombre,
        puesto: datos.puesto,
        estado: datos.estado,
        rolGeneral: datos.rolGeneral,
      });
      await eq.guardarPermisos(datos.userId, datos.permisos);
    } else {
      const ok = await eq.invitarColaborador({
        correo: datos.correo,
        nombre: datos.nombre,
        puesto: datos.puesto,
        rolGeneral: datos.rolGeneral,
        estado: datos.estado,
        permisos: datos.permisos,
      });
      if (!ok) return;
    }
    setPanel(null);
  }

  return (
    <Card className="space-y-4 p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold">Equipo y permisos</h2>
          <p className="text-xs text-muted-foreground">
            Decide a qué paneles puede entrar cada colaborador y con qué nivel.
          </p>
        </div>
        {eq.soyAdmin && (
          <Button size="sm" onClick={() => setPanel({ modo: "nuevo" })}>
            <UserPlus className="h-4 w-4" />
            Agregar colaborador
          </Button>
        )}
      </div>

      {/* Nombre de la organización */}
      <div className="flex flex-wrap items-end gap-2">
        <Field id="org-nombre" label="Nombre de la organización" className="flex-1">
          <Input
            id="org-nombre"
            value={nombreOrg}
            disabled={!eq.soyAdmin}
            onChange={(e) => setNombreOrg(e.target.value)}
          />
        </Field>
        {eq.soyAdmin && (
          <Button
            variant="outline"
            disabled={eq.procesando || !nombreOrg.trim()}
            onClick={() => void eq.renombrar(nombreOrg)}
          >
            Guardar
          </Button>
        )}
      </div>

      <Separator />

      {/* Tabla de colaboradores */}
      {eq.cargando ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded bg-muted" />
          ))}
        </div>
      ) : (
        <>
          {/* Escritorio */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-left text-xs text-muted-foreground">
                  <th className="py-2 pr-3">Nombre</th>
                  <th className="py-2 pr-3">Correo</th>
                  <th className="py-2 pr-3">Puesto</th>
                  <th className="py-2 pr-3">Estado</th>
                  <th className="py-2 pr-3">Rol</th>
                  <th className="py-2 pr-3">Paneles</th>
                  <th className="py-2 pr-3">Último acceso</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody className="divide-y">
                {eq.miembros.map((m) => {
                  const perms = eq.permisosPorUsuario[m.userId] ?? PERMISOS_VACIOS;
                  const soyYo = m.userId === eq.miUserId;
                  return (
                    <tr key={m.id}>
                      <td className="py-2 pr-3 font-medium">
                        {m.nombre || "—"}
                        {soyYo && (
                          <span className="ml-1 text-xs text-muted-foreground">
                            (tú)
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {m.correo}
                      </td>
                      <td className="py-2 pr-3 text-muted-foreground">
                        {m.puesto || "—"}
                      </td>
                      <td className="py-2 pr-3">
                        <span
                          className={cn(
                            "rounded-full px-2 py-0.5 text-xs font-medium",
                            ESTADO_CLASE[m.estado] ?? ESTADO_CLASE.inactivo,
                          )}
                        >
                          {m.estado}
                        </span>
                      </td>
                      <td className="py-2 pr-3">
                        {m.rolGeneral === "admin" ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-estado-avance-fg">
                            <ShieldCheck className="h-3.5 w-3.5" />
                            Administrador
                          </span>
                        ) : (
                          <span className="text-xs capitalize text-muted-foreground">
                            {m.rolGeneral}
                          </span>
                        )}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {resumenPaneles(perms)}
                      </td>
                      <td className="py-2 pr-3 text-xs text-muted-foreground">
                        {m.ultimoAcceso
                          ? formatearFechaHora(m.ultimoAcceso)
                          : "Nunca"}
                      </td>
                      <td className="py-2 text-right">
                        {eq.soyAdmin && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setPanel({ modo: "editar", miembro: m })
                            }
                          >
                            Editar permisos
                          </Button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Móvil: tarjeta por colaborador */}
          <ul className="space-y-2 md:hidden">
            {eq.miembros.map((m) => {
              const perms = eq.permisosPorUsuario[m.userId] ?? PERMISOS_VACIOS;
              return (
                <li key={m.id} className="rounded-md border p-3 text-sm">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium">{m.nombre || m.correo}</span>
                    <span
                      className={cn(
                        "rounded-full px-2 py-0.5 text-xs font-medium",
                        ESTADO_CLASE[m.estado] ?? ESTADO_CLASE.inactivo,
                      )}
                    >
                      {m.estado}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">{m.correo}</p>
                  <p className="text-xs text-muted-foreground">
                    {m.puesto || "Sin puesto"} · {resumenPaneles(perms)}
                  </p>
                  {eq.soyAdmin && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 w-full"
                      onClick={() => setPanel({ modo: "editar", miembro: m })}
                    >
                      Editar permisos
                    </Button>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {/* Invitaciones pendientes */}
      {eq.invitaciones.length > 0 && (
        <div>
          <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Invitaciones pendientes
          </h3>
          <ul className="space-y-1">
            {eq.invitaciones.map((i) => (
              <li
                key={i.id}
                className="flex flex-wrap items-center gap-2 rounded-md border border-dashed px-2 py-1.5 text-sm"
              >
                <Mail className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="min-w-0 flex-1 truncate">{i.correo}</span>
                {eq.soyAdmin && (
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={eq.procesando}
                    onClick={() => void eq.cancelarInvitacion(i.id)}
                  >
                    Cancelar
                  </Button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {!eq.altaDisponible && eq.soyAdmin && (
        <p className="rounded-md border border-dashed p-3 text-xs text-muted-foreground">
          Para enviar invitaciones por correo agrega{" "}
          <code className="rounded bg-muted px-1">SUPABASE_SERVICE_ROLE_KEY</code>{" "}
          en Vercel (Settings → Environment Variables, sin el prefijo
          NEXT_PUBLIC) y vuelve a desplegar. Los permisos igual se guardan.
        </p>
      )}

      {panel && (
        <PanelColaborador
          modo={panel.modo}
          miembro={panel.modo === "editar" ? panel.miembro : undefined}
          permisosActuales={
            panel.modo === "editar"
              ? (eq.permisosPorUsuario[panel.miembro.userId] ?? PERMISOS_VACIOS)
              : undefined
          }
          altaDisponible={eq.altaDisponible}
          procesando={eq.procesando}
          totalAdmins={totalAdmins}
          onCerrar={() => setPanel(null)}
          onGuardar={(datos) => {
            // Confirmación para cambios críticos (dar/quitar Configuración o admin).
            const critico =
              datos.rolGeneral === "admin" ||
              datos.permisos.configuracion === "manage" ||
              (panel.modo === "editar" &&
                panel.miembro.rolGeneral === "admin" &&
                datos.rolGeneral !== "admin");
            if (critico && panel.modo === "editar") {
              setCriticoPend({
                userId: panel.miembro.userId,
                perfil: {
                  nombre: datos.nombre,
                  puesto: datos.puesto,
                  estado: datos.estado,
                  rolGeneral: datos.rolGeneral,
                },
                permisos: datos.permisos,
              });
              return;
            }
            void guardarColaborador({
              ...datos,
              userId:
                panel.modo === "editar" ? panel.miembro.userId : undefined,
              correo:
                panel.modo === "editar" ? panel.miembro.correo : datos.correo,
            });
          }}
        />
      )}

      {/* Confirmación de cambio crítico */}
      <Dialog
        open={criticoPend !== null}
        onOpenChange={(v) => !v && setCriticoPend(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Confirmar cambio de permisos</DialogTitle>
            <DialogDescription>
              Vas a modificar accesos sensibles (administración o Configuración).
              ¿Continuar?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCriticoPend(null)}>
              Cancelar
            </Button>
            <Button
              disabled={eq.procesando}
              onClick={async () => {
                if (!criticoPend) return;
                await eq.guardarPerfilColaborador(
                  criticoPend.userId,
                  criticoPend.perfil,
                );
                await eq.guardarPermisos(
                  criticoPend.userId,
                  criticoPend.permisos,
                );
                setCriticoPend(null);
                setPanel(null);
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

// ── Panel lateral de alta / edición ─────────────────────────
function PanelColaborador({
  modo,
  miembro,
  permisosActuales,
  altaDisponible,
  procesando,
  totalAdmins,
  onCerrar,
  onGuardar,
}: {
  modo: "nuevo" | "editar";
  miembro?: MiembroOrg;
  permisosActuales?: MapaPermisos;
  altaDisponible: boolean;
  procesando: boolean;
  totalAdmins: number;
  onCerrar: () => void;
  onGuardar: (datos: {
    correo: string;
    nombre: string;
    puesto: string;
    rolGeneral: string;
    estado: string;
    permisos: MapaPermisos;
  }) => void;
}) {
  const [correo, setCorreo] = useState(miembro?.correo ?? "");
  const [nombre, setNombre] = useState(miembro?.nombre ?? "");
  const [puesto, setPuesto] = useState(miembro?.puesto ?? "");
  const [rolGeneral, setRolGeneral] = useState<string>(
    miembro?.rolGeneral ?? "colaborador",
  );
  const [estado, setEstado] = useState<string>(
    miembro?.estado ?? "pendiente",
  );
  const [permisos, setPermisos] = useState<MapaPermisos>(
    permisosActuales ?? plantillaDeRol("colaborador"),
  );

  // Al cambiar el rol general, propón su plantilla (solo punto de partida).
  function cambiarRol(r: string) {
    setRolGeneral(r);
    if (r !== "personalizado") setPermisos(plantillaDeRol(r));
  }

  const esUltimoAdmin =
    modo === "editar" &&
    miembro?.rolGeneral === "admin" &&
    totalAdmins <= 1;

  const correoValido = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
  const puedeGuardar =
    modo === "editar" ? true : correoValido && altaDisponible;

  return (
    <Sheet open onOpenChange={(v) => !v && onCerrar()}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 overflow-y-auto p-0 sm:max-w-lg"
      >
        <SheetHeader className="border-b p-4 text-left">
          <SheetTitle>
            {modo === "nuevo" ? "Agregar colaborador" : "Editar permisos"}
          </SheetTitle>
          <SheetDescription>
            {modo === "nuevo"
              ? "Se enviará una invitación por correo. Los permisos quedan listos aunque siga pendiente."
              : miembro?.correo}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="c-nombre" label="Nombre completo">
              <Input
                id="c-nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
              />
            </Field>
            <Field id="c-puesto" label="Puesto">
              <Input
                id="c-puesto"
                value={puesto}
                onChange={(e) => setPuesto(e.target.value)}
              />
            </Field>
          </div>

          {modo === "nuevo" && (
            <Field id="c-correo" label="Correo electrónico" requerido>
              <Input
                id="c-correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="persona@empresa.com"
              />
            </Field>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field id="c-rol" label="Rol / plantilla">
              <Select value={rolGeneral} onValueChange={cambiarRol}>
                <SelectTrigger id="c-rol">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES_GENERAL.map((r) => (
                    <SelectItem key={r} value={r}>
                      {PLANTILLA_LABEL[r as keyof typeof PLANTILLA_LABEL] ?? r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field id="c-estado" label="Estado">
              <Select
                value={estado}
                onValueChange={setEstado}
                disabled={esUltimoAdmin}
              >
                <SelectTrigger id="c-estado">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="activo">Activo</SelectItem>
                  <SelectItem value="inactivo">Inactivo</SelectItem>
                  <SelectItem value="pendiente">Invitación pendiente</SelectItem>
                </SelectContent>
              </Select>
            </Field>
          </div>

          {esUltimoAdmin && (
            <p className="rounded-md bg-estado-platicas-suave p-2 text-xs text-estado-platicas-fg">
              Es el último administrador: no puedes quitarle el rol ni
              desactivarlo.
            </p>
          )}

          <div>
            <h3 className="mb-2 text-sm font-semibold">Permisos por panel</h3>
            <MatrizPermisos
              valor={permisos}
              onChange={setPermisos}
              deshabilitado={esUltimoAdmin}
            />
          </div>

          <div className="rounded-md border bg-muted/40 p-3">
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Resumen
            </p>
            <ResumenPermisos valor={permisos} />
          </div>
        </div>

        <div className="mt-auto flex gap-2 border-t p-4">
          <Button variant="outline" className="flex-1" onClick={onCerrar}>
            Cancelar
          </Button>
          <Button
            className="flex-1"
            disabled={procesando || !puedeGuardar}
            onClick={() =>
              onGuardar({
                correo: correo.trim().toLowerCase(),
                nombre,
                puesto,
                rolGeneral: esUltimoAdmin ? "admin" : rolGeneral,
                estado: esUltimoAdmin ? "activo" : estado,
                permisos: esUltimoAdmin
                  ? plantillaDeRol("admin")
                  : permisos,
              })
            }
          >
            {modo === "nuevo" ? "Enviar invitación" : "Guardar"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
