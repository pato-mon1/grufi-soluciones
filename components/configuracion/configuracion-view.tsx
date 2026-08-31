"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  Cloud,
  Download,
  HardDrive,
  Loader2,
  LogOut,
  ShieldAlert,
} from "lucide-react";
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
import { PageHeader } from "@/components/app-shell/page-header";
import { Field } from "@/components/empresas/field";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { getSupabaseClient } from "@/lib/supabase/client";
import { clasificarSeguimiento } from "@/lib/seguimientos";
import { tareaVencida } from "@/lib/tareas";
import { hoyISO } from "@/lib/date";
import { formatearMonto, montoATextoEntrada, parsearMonto } from "@/lib/money";
import { construirRespaldo, nombreArchivoRespaldo } from "@/lib/respaldo";
import {
  AJUSTES_PREDETERMINADOS,
  ROLES_PERFIL,
  type AjustesApp,
  type RolPerfil,
} from "@/lib/types";

export function ConfiguracionView() {
  const {
    empresas,
    contactos,
    actividades,
    esSupabase,
    cerrarSesion,
  } = useEmpresas();
  const {
    perfil,
    ajustes,
    tareas,
    categorias,
    movimientos,
    eventos,
    procesando,
    guardarPerfil,
    guardarAjustes,
  } = useFase2();

  const esAdmin = !perfil || perfil.rol === "admin";

  if (!esAdmin) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6 lg:py-10">
        <PageHeader title="Configuración" />
        <Card className="mt-6 flex items-center gap-3 p-6">
          <ShieldAlert className="h-6 w-6 text-alerta" />
          <div>
            <p className="font-medium">Solo administradores</p>
            <p className="text-sm text-muted-foreground">
              Tu perfil tiene el rol “Miembro”. Pide a un administrador que
              cambie tu rol para acceder a esta sección.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader
        title="Configuración"
        subtitle="Perfil, ajustes generales, finanzas, notificaciones, datos y seguridad."
      />

      <SeccionPerfil
        perfil={perfil}
        procesando={procesando}
        onGuardar={guardarPerfil}
      />

      <SeccionAjustes ajustes={ajustes} onGuardar={guardarAjustes} />

      <SeccionNotificaciones
        ajustes={ajustes}
        empresas={empresas}
        tareas={tareas}
        movimientos={movimientos}
        onGuardar={guardarAjustes}
      />

      <SeccionDatos
        esSupabase={esSupabase}
        armarRespaldo={() =>
          construirRespaldo({
            empresas,
            contactos,
            actividades,
            tareas,
            categorias,
            movimientos,
            eventos,
            ajustes,
          })
        }
      />

      <SeccionSeguridad
        esSupabase={esSupabase}
        onCerrarSesion={() => void cerrarSesion()}
      />
    </div>
  );
}

// ────────────────────────────────────────────────────────────

function TarjetaSeccion({
  titulo,
  descripcion,
  children,
}: {
  titulo: string;
  descripcion?: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="space-y-4 p-5">
      <div>
        <h2 className="text-sm font-semibold">{titulo}</h2>
        {descripcion && (
          <p className="text-xs text-muted-foreground">{descripcion}</p>
        )}
      </div>
      {children}
    </Card>
  );
}

function SeccionPerfil({
  perfil,
  procesando,
  onGuardar,
}: {
  perfil: ReturnType<typeof useFase2>["perfil"];
  procesando: boolean;
  onGuardar: ReturnType<typeof useFase2>["guardarPerfil"];
}) {
  const [nombre, setNombre] = useState("");
  const [rol, setRol] = useState<RolPerfil>("admin");
  const [activo, setActivo] = useState(true);

  useEffect(() => {
    setNombre(perfil?.nombre ?? "");
    setRol(perfil?.rol ?? "admin");
    setActivo(perfil?.activo ?? true);
  }, [perfil]);

  return (
    <TarjetaSeccion
      titulo="Tu perfil"
      descripcion="Datos de la persona que usa esta cuenta. El correo proviene del inicio de sesión."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="p-nombre" label="Nombre">
          <Input
            id="p-nombre"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            autoComplete="off"
          />
        </Field>
        <Field id="p-correo" label="Correo">
          <Input id="p-correo" value={perfil?.correo ?? ""} disabled />
        </Field>
        <Field id="p-rol" label="Rol">
          <Select value={rol} onValueChange={(v) => setRol(v as RolPerfil)}>
            <SelectTrigger id="p-rol">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ROLES_PERFIL.map((r) => (
                <SelectItem key={r} value={r}>
                  {r === "admin" ? "Administrador" : "Miembro"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
        <label className="flex items-center gap-2 self-end pb-2 text-sm">
          <input
            type="checkbox"
            className="h-4 w-4 rounded border-input accent-champagne"
            checked={activo}
            onChange={(e) => setActivo(e.target.checked)}
          />
          Cuenta activa
        </label>
      </div>
      <p className="text-xs text-muted-foreground">
        El rol se guarda en tu perfil. El control de varios usuarios por
        organización llegará cuando se agreguen más cuentas.
      </p>
      <Button
        disabled={procesando}
        onClick={() => void onGuardar({ nombre, correo: perfil?.correo ?? "", rol, activo })}
      >
        Guardar perfil
      </Button>
    </TarjetaSeccion>
  );
}

function SeccionAjustes({
  ajustes,
  onGuardar,
}: {
  ajustes: AjustesApp;
  onGuardar: (a: AjustesApp) => Promise<void>;
}) {
  const [moneda, setMoneda] = useState(ajustes.moneda);
  const [zona, setZona] = useState(ajustes.zonaHoraria);
  const [meta, setMeta] = useState(montoATextoEntrada(ajustes.metaAnual));
  const [saldo, setSaldo] = useState(montoATextoEntrada(ajustes.saldoInicial));

  useEffect(() => {
    setMoneda(ajustes.moneda);
    setZona(ajustes.zonaHoraria);
    setMeta(montoATextoEntrada(ajustes.metaAnual));
    setSaldo(montoATextoEntrada(ajustes.saldoInicial));
  }, [ajustes]);

  function guardar() {
    const metaP = parsearMonto(meta);
    const saldoP = parsearMonto(saldo);
    if (!metaP.valido || !saldoP.valido) {
      toast.error("Revisa los montos de meta y saldo inicial.");
      return;
    }
    void onGuardar({
      ...ajustes,
      moneda: moneda.trim() || "MXN",
      zonaHoraria: zona.trim() || AJUSTES_PREDETERMINADOS.zonaHoraria,
      metaAnual: metaP.monto ?? 0,
      saldoInicial: saldoP.monto ?? 0,
    });
  }

  return (
    <TarjetaSeccion
      titulo="General y finanzas"
      descripcion="Moneda, zona horaria y parámetros del módulo de Finanzas."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="a-moneda" label="Moneda">
          <Input
            id="a-moneda"
            value={moneda}
            onChange={(e) => setMoneda(e.target.value)}
          />
        </Field>
        <Field id="a-zona" label="Zona horaria">
          <Input
            id="a-zona"
            value={zona}
            onChange={(e) => setZona(e.target.value)}
          />
        </Field>
        <Field id="a-meta" label="Meta anual de ingresos (MXN)" hint="0 = sin meta">
          <Input
            id="a-meta"
            inputMode="decimal"
            value={meta}
            onChange={(e) => setMeta(e.target.value)}
            placeholder="0"
          />
        </Field>
        <Field id="a-saldo" label="Saldo inicial de caja (MXN)">
          <Input
            id="a-saldo"
            inputMode="decimal"
            value={saldo}
            onChange={(e) => setSaldo(e.target.value)}
            placeholder="0"
          />
        </Field>
      </div>
      <Button onClick={guardar}>Guardar ajustes</Button>
    </TarjetaSeccion>
  );
}

function SeccionNotificaciones({
  ajustes,
  empresas,
  tareas,
  movimientos,
  onGuardar,
}: {
  ajustes: AjustesApp;
  empresas: ReturnType<typeof useEmpresas>["empresas"];
  tareas: ReturnType<typeof useFase2>["tareas"];
  movimientos: ReturnType<typeof useFase2>["movimientos"];
  onGuardar: (a: AjustesApp) => Promise<void>;
}) {
  const [seg, setSeg] = useState(ajustes.notifSeguimientosDias);
  const [tar, setTar] = useState(ajustes.notifTareasDias);
  const [cob, setCob] = useState(ajustes.notifCobrosDias);

  useEffect(() => {
    setSeg(ajustes.notifSeguimientosDias);
    setTar(ajustes.notifTareasDias);
    setCob(ajustes.notifCobrosDias);
  }, [ajustes]);

  const hoy = hoyISO();
  const preview = useMemo(() => {
    const dentroDe = (fecha: string | null, dias: number) => {
      if (!fecha) return false;
      const diff =
        (new Date(`${fecha.slice(0, 10)}T00:00:00`).getTime() -
          new Date(`${hoy}T00:00:00`).getTime()) /
        86_400_000;
      return diff <= dias; // incluye vencidos
    };
    const avisos: string[] = [];
    for (const e of empresas) {
      const b = clasificarSeguimiento(e, hoy);
      if (
        (b === "vencido" || b === "hoy" || b === "proximos7") &&
        dentroDe(e.fechaProximoSeguimiento, seg)
      ) {
        avisos.push(`Seguimiento: ${e.nombre}`);
      }
    }
    for (const t of tareas) {
      if (
        t.estado !== "hecha" &&
        (tareaVencida(t, hoy) || dentroDe(t.fechaLimite, tar))
      ) {
        avisos.push(`Tarea: ${t.titulo}`);
      }
    }
    for (const m of movimientos) {
      if (m.estado === "pendiente" && dentroDe(m.fecha, cob)) {
        avisos.push(
          `${m.tipo === "ingreso" ? "Cobro" : "Pago"}: ${m.concepto} (${formatearMonto(m.monto)})`,
        );
      }
    }
    return avisos.slice(0, 12);
  }, [empresas, tareas, movimientos, seg, tar, cob, hoy]);

  return (
    <TarjetaSeccion
      titulo="Notificaciones"
      descripcion="Días de anticipación para considerar algo “próximo”. La vista previa se calcula con tus datos actuales."
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Field id="n-seg" label="Seguimientos (días)">
          <Input
            id="n-seg"
            type="number"
            min={0}
            max={60}
            value={seg}
            onChange={(e) => setSeg(Number(e.target.value) || 0)}
          />
        </Field>
        <Field id="n-tar" label="Tareas (días)">
          <Input
            id="n-tar"
            type="number"
            min={0}
            max={60}
            value={tar}
            onChange={(e) => setTar(Number(e.target.value) || 0)}
          />
        </Field>
        <Field id="n-cob" label="Cobros y pagos (días)">
          <Input
            id="n-cob"
            type="number"
            min={0}
            max={60}
            value={cob}
            onChange={(e) => setCob(Number(e.target.value) || 0)}
          />
        </Field>
      </div>

      <div className="rounded-md border bg-muted/40 p-3">
        <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Vista previa de avisos ({preview.length})
        </p>
        {preview.length === 0 ? (
          <p className="text-xs text-muted-foreground">
            Nada dentro de los rangos indicados.
          </p>
        ) : (
          <ul className="space-y-0.5 text-sm">
            {preview.map((a, i) => (
              <li key={i} className="truncate">
                • {a}
              </li>
            ))}
          </ul>
        )}
      </div>

      <Button
        onClick={() =>
          void onGuardar({
            ...ajustes,
            notifSeguimientosDias: seg,
            notifTareasDias: tar,
            notifCobrosDias: cob,
          })
        }
      >
        Guardar notificaciones
      </Button>
    </TarjetaSeccion>
  );
}

function SeccionDatos({
  esSupabase,
  armarRespaldo,
}: {
  esSupabase: boolean;
  armarRespaldo: () => object;
}) {
  function descargar() {
    const blob = new Blob([JSON.stringify(armarRespaldo(), null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nombreArchivoRespaldo();
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("Respaldo descargado");
  }

  return (
    <TarjetaSeccion
      titulo="Datos"
      descripcion="Estado del almacenamiento y respaldo completo en formato JSON."
    >
      <div className="flex items-center gap-2 text-sm">
        {esSupabase ? (
          <>
            <Cloud className="h-4 w-4 text-estado-avance" />
            <span>
              Conectado a <strong>Supabase (nube)</strong>. Los cambios se
              sincronizan entre dispositivos.
            </span>
          </>
        ) : (
          <>
            <HardDrive className="h-4 w-4 text-muted-foreground" />
            <span>
              Modo <strong>Local</strong>. Los datos viven solo en este
              navegador.
            </span>
          </>
        )}
      </div>
      <Separator />
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" onClick={descargar}>
          <Download className="h-4 w-4" />
          Descargar respaldo (JSON)
        </Button>
        <p className="text-xs text-muted-foreground">
          Incluye empresas, contactos, actividades, tareas, categorías,
          movimientos, eventos y ajustes. Para importar empresas desde Excel/CSV
          usa la sección Empresas.
        </p>
      </div>
    </TarjetaSeccion>
  );
}

function SeccionSeguridad({
  esSupabase,
  onCerrarSesion,
}: {
  esSupabase: boolean;
  onCerrarSesion: () => void;
}) {
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [guardando, setGuardando] = useState(false);

  async function cambiarContrasena() {
    if (p1.length < 8) {
      toast.error("La contraseña debe tener al menos 8 caracteres.");
      return;
    }
    if (p1 !== p2) {
      toast.error("Las contraseñas no coinciden.");
      return;
    }
    setGuardando(true);
    try {
      const { error } = await getSupabaseClient().auth.updateUser({
        password: p1,
      });
      if (error) throw new Error(error.message);
      toast.success("Contraseña actualizada");
      setP1("");
      setP2("");
    } catch (e) {
      toast.error("No se pudo cambiar la contraseña", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <TarjetaSeccion
      titulo="Seguridad"
      descripcion="Cambia tu contraseña o cierra la sesión en este dispositivo."
    >
      {esSupabase ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="s-p1" label="Nueva contraseña">
            <Input
              id="s-p1"
              type="password"
              value={p1}
              autoComplete="new-password"
              onChange={(e) => setP1(e.target.value)}
            />
          </Field>
          <Field id="s-p2" label="Repite la contraseña">
            <Input
              id="s-p2"
              type="password"
              value={p2}
              autoComplete="new-password"
              onChange={(e) => setP2(e.target.value)}
            />
          </Field>
          <div className="sm:col-span-2">
            <Button onClick={cambiarContrasena} disabled={guardando}>
              {guardando && <Loader2 className="h-4 w-4 animate-spin" />}
              Cambiar contraseña
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">
          En modo Local no hay inicio de sesión.
        </p>
      )}
      <Separator />
      <Button
        variant="outline"
        className="text-destructive hover:text-destructive"
        onClick={onCerrarSesion}
      >
        <LogOut className="h-4 w-4" />
        Cerrar sesión
      </Button>
    </TarjetaSeccion>
  );
}
