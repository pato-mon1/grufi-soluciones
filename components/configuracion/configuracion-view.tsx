"use client";

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import {
  Cloud,
  Download,
  FileUp,
  HardDrive,
  History,
  Loader2,
  LogOut,
  ShieldAlert,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
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
import { PageHeader } from "@/components/app-shell/page-header";
import { Field } from "@/components/empresas/field";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { getSupabaseClient } from "@/lib/supabase/client";
import { getFase2Repository, getRepository } from "@/lib/repository";
import { clasificarSeguimiento } from "@/lib/seguimientos";
import { tareaVencida } from "@/lib/tareas";
import {
  clavesOrdenadas,
  type EstadoOportunidadInput,
  type EstadoResuelto,
} from "@/lib/estados";
import { formatearFechaHora, hoyISO } from "@/lib/date";
import { formatearMonto, montoATextoEntrada, parsearMonto } from "@/lib/money";
import {
  construirRespaldo,
  inspeccionarRespaldo,
  nombreArchivoRespaldo,
  type Respaldo,
  type ResumenRespaldo,
} from "@/lib/respaldo";
import {
  AJUSTES_PREDETERMINADOS,
  ROLES_PERFIL,
  type AjustesApp,
  type EntradaBitacora,
  type EstadoEmpresa,
  type RolPerfil,
} from "@/lib/types";

export function ConfiguracionView() {
  const {
    empresas,
    contactos,
    actividades,
    esSupabase,
    cerrarSesion,
    recargar: recargarEmpresas,
  } = useEmpresas();
  const {
    perfil,
    ajustes,
    tareas,
    categorias,
    movimientos,
    eventos,
    bitacora,
    estadosConfig,
    procesando,
    guardarPerfil,
    guardarAjustes,
    guardarEstadoOportunidad,
    anotarBitacora,
    recargar: recargarFase2,
  } = useFase2();

  const [restaurando, setRestaurando] = useState(false);
  const esAdmin = !perfil || perfil.rol === "admin";

  async function restaurar(respaldo: Respaldo): Promise<void> {
    setRestaurando(true);
    const re = getRepository();
    const rf = getFase2Repository();
    const mapEmp = new Map<string, string>();
    const mapCat = new Map<string, string>();
    try {
      for (const e of respaldo.empresas ?? []) {
        try {
          const nueva = await re.create({
            nombre: e.nombre,
            estado: e.estado,
            montoResultado: e.montoResultado,
            notas: e.notas,
            fechaUltimoContacto: e.fechaUltimoContacto,
            fechaProximoSeguimiento: e.fechaProximoSeguimiento,
            requiereSeguimiento: e.requiereSeguimiento,
          });
          mapEmp.set(e.id, nueva.id);
        } catch {
          /* omite la empresa con error */
        }
      }
      for (const c of respaldo.contactos ?? []) {
        const eid = mapEmp.get(c.empresaId);
        if (!eid) continue;
        try {
          await re.crearContacto(eid, {
            nombre: c.nombre,
            puesto: c.puesto,
            telefono: c.telefono,
            correo: c.correo,
            principal: c.principal,
          });
        } catch {
          /* omite */
        }
      }
      for (const a of respaldo.actividades ?? []) {
        const eid = mapEmp.get(a.empresaId);
        if (!eid) continue;
        try {
          await re.crearActividad({
            empresaId: eid,
            tipo: a.tipo,
            fechaHora: a.fechaHora,
            descripcion: a.descripcion,
          });
        } catch {
          /* omite */
        }
      }
      for (const cat of respaldo.categorias ?? []) {
        try {
          const nc = await rf.crearCategoria({
            nombre: cat.nombre,
            tipo: cat.tipo,
            color: cat.color,
            archivada: cat.archivada,
          });
          mapCat.set(cat.id, nc.id);
        } catch {
          /* omite */
        }
      }
      for (const m of respaldo.movimientos ?? []) {
        try {
          await rf.crearMovimiento({
            empresaId: m.empresaId ? (mapEmp.get(m.empresaId) ?? null) : null,
            categoriaId: m.categoriaId
              ? (mapCat.get(m.categoriaId) ?? null)
              : null,
            tipo: m.tipo,
            concepto: m.concepto,
            monto: m.monto,
            estado: m.estado,
            fecha: m.fecha,
            fechaLiquidado: m.fechaLiquidado,
            notas: m.notas,
          });
        } catch {
          /* omite */
        }
      }
      for (const t of respaldo.tareas ?? []) {
        try {
          await rf.crearTarea({
            empresaId: t.empresaId ? (mapEmp.get(t.empresaId) ?? null) : null,
            titulo: t.titulo,
            descripcion: t.descripcion,
            estado: t.estado,
            prioridad: t.prioridad,
            fechaLimite: t.fechaLimite,
            orden: t.orden,
            responsable: t.responsable,
          });
        } catch {
          /* omite */
        }
      }
      for (const ev of respaldo.eventos ?? []) {
        try {
          await rf.crearEvento({
            empresaId: ev.empresaId
              ? (mapEmp.get(ev.empresaId) ?? null)
              : null,
            titulo: ev.titulo,
            descripcion: ev.descripcion,
            inicio: ev.inicio,
            fin: ev.fin,
            todoElDia: ev.todoElDia,
            tipo: ev.tipo,
          });
        } catch {
          /* omite */
        }
      }
      if (respaldo.ajustes) {
        try {
          await rf.guardarAjustes(respaldo.ajustes);
        } catch {
          /* omite */
        }
      }
      await Promise.all([recargarEmpresas(), recargarFase2()]);
      void anotarBitacora({
        entidad: "respaldo",
        entidadId: null,
        accion: "restaurar",
        resumen: `Respaldo restaurado: ${mapEmp.size} empresas`,
      });
      toast.success("Respaldo restaurado", {
        description: `${mapEmp.size} empresas y sus datos relacionados se agregaron.`,
      });
    } catch (e) {
      toast.error("La restauración falló a mitad de camino", {
        description: e instanceof Error ? e.message : undefined,
      });
    } finally {
      setRestaurando(false);
    }
  }

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

      <SeccionEstados
        config={estadosConfig}
        procesando={procesando}
        onGuardar={guardarEstadoOportunidad}
      />

      <SeccionNotificaciones
        ajustes={ajustes}
        empresas={empresas}
        tareas={tareas}
        movimientos={movimientos}
        onGuardar={guardarAjustes}
      />

      <SeccionDatos
        esSupabase={esSupabase}
        restaurando={restaurando}
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
        onRestaurar={restaurar}
      />

      <SeccionBitacora entradas={bitacora} />

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

const PALETA_ESTADO = [
  "#64748B",
  "#D97706",
  "#2563EB",
  "#7C3AED",
  "#3F7D62",
  "#9B4F55",
  "#0EA5E9",
  "#DB2777",
];

function SeccionEstados({
  config,
  procesando,
  onGuardar,
}: {
  config: Record<EstadoEmpresa, EstadoResuelto>;
  procesando: boolean;
  onGuardar: (input: EstadoOportunidadInput) => Promise<unknown>;
}) {
  const claves = clavesOrdenadas(config);
  type Fila = { etiqueta: string; color: string; orden: number };
  const [draft, setDraft] = useState<Record<string, Fila>>({});

  useEffect(() => {
    const inicial: Record<string, Fila> = {};
    for (const k of claves) {
      inicial[k] = {
        etiqueta: config[k].etiqueta,
        color: config[k].color,
        orden: config[k].orden,
      };
    }
    setDraft(inicial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config]);

  function set(clave: string, cambios: Partial<Fila>) {
    setDraft((prev) => ({ ...prev, [clave]: { ...prev[clave], ...cambios } }));
  }

  async function guardar() {
    const objetivos = claves.filter((k) => {
      const d = draft[k];
      return (
        d &&
        (d.etiqueta.trim() !== config[k].etiqueta ||
          d.color !== config[k].color ||
          d.orden !== config[k].orden)
      );
    });
    if (objetivos.length === 0) {
      toast.info("No hay cambios que guardar.");
      return;
    }
    for (const k of objetivos) {
      const d = draft[k];
      if (!d.etiqueta.trim()) {
        toast.error("Ningún estado puede quedarse sin nombre.");
        return;
      }
      await onGuardar({
        clave: k as EstadoEmpresa,
        etiqueta: d.etiqueta.trim(),
        color: d.color,
        orden: d.orden,
      });
    }
    toast.success("Estados actualizados");
  }

  return (
    <TarjetaSeccion
      titulo="Estados de oportunidad"
      descripcion="Cambia el nombre visible, el color y el orden de los 6 estados. El valor guardado internamente y su carácter de cierre/ganada no cambian."
    >
      <div className="space-y-2">
        {claves.map((k) => {
          const d = draft[k] ?? {
            etiqueta: config[k].etiqueta,
            color: config[k].color,
            orden: config[k].orden,
          };
          return (
            <div
              key={k}
              className="flex flex-wrap items-center gap-2 rounded-md border p-2"
            >
              <div className="flex items-center gap-1">
                {PALETA_ESTADO.map((c) => (
                  <button
                    key={c}
                    type="button"
                    aria-label={`Color ${c} para ${k}`}
                    onClick={() => set(k, { color: c })}
                    className={cn(
                      "h-5 w-5 rounded-full border-2",
                      d.color === c ? "border-foreground" : "border-transparent",
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <Input
                value={d.etiqueta}
                onChange={(e) => set(k, { etiqueta: e.target.value })}
                className="h-8 min-w-[140px] flex-1"
                aria-label={`Nombre del estado ${k}`}
              />
              <Input
                type="number"
                value={d.orden}
                onChange={(e) => set(k, { orden: Number(e.target.value) || 0 })}
                className="h-8 w-16"
                aria-label={`Orden del estado ${k}`}
              />
              <span className="w-full text-[11px] text-muted-foreground sm:w-auto">
                interno: {k}
                {config[k].cerrado ? " · cierre" : ""}
              </span>
            </div>
          );
        })}
      </div>
      <Button onClick={guardar} disabled={procesando}>
        Guardar estados
      </Button>
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
  restaurando,
  armarRespaldo,
  onRestaurar,
}: {
  esSupabase: boolean;
  restaurando: boolean;
  armarRespaldo: () => Respaldo;
  onRestaurar: (respaldo: Respaldo) => Promise<void>;
}) {
  const [pendiente, setPendiente] = useState<{
    respaldo: Respaldo;
    resumen: ResumenRespaldo;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

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

  async function alElegirArchivo(e: ChangeEvent<HTMLInputElement>) {
    const archivo = e.target.files?.[0];
    e.target.value = ""; // permite volver a elegir el mismo archivo
    if (!archivo) return;
    try {
      const texto = await archivo.text();
      const datos = JSON.parse(texto) as unknown;
      const resumen = inspeccionarRespaldo(datos);
      if (!resumen) {
        toast.error("El archivo no parece un respaldo válido de GRUFI.");
        return;
      }
      setPendiente({ respaldo: datos as Respaldo, resumen });
    } catch {
      toast.error("No se pudo leer el archivo JSON.");
    }
  }

  const total = pendiente
    ? Object.values(pendiente.resumen).reduce((a, b) => a + b, 0)
    : 0;

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
      <div className="flex flex-wrap items-center gap-2">
        <Button variant="outline" onClick={descargar}>
          <Download className="h-4 w-4" />
          Descargar respaldo (JSON)
        </Button>
        <Button
          variant="outline"
          disabled={restaurando}
          onClick={() => inputRef.current?.click()}
        >
          {restaurando ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <FileUp className="h-4 w-4" />
          )}
          Restaurar desde archivo
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={alElegirArchivo}
        />
      </div>
      <p className="text-xs text-muted-foreground">
        El respaldo incluye empresas, contactos, actividades, tareas,
        categorías, movimientos, eventos y ajustes. Restaurar{" "}
        <strong>agrega</strong> los registros del archivo; no borra ni
        reemplaza lo que ya tienes.
      </p>

      <Dialog
        open={pendiente !== null}
        onOpenChange={(v) => !v && setPendiente(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Restaurar respaldo</DialogTitle>
            <DialogDescription>
              Se agregarán <strong>{total}</strong> registros a los datos
              actuales. Esto no se puede deshacer automáticamente (tendrías que
              borrarlos a mano).
            </DialogDescription>
          </DialogHeader>
          {pendiente && (
            <ul className="grid grid-cols-2 gap-1 text-sm">
              {(
                [
                  ["Empresas", pendiente.resumen.empresas],
                  ["Contactos", pendiente.resumen.contactos],
                  ["Actividades", pendiente.resumen.actividades],
                  ["Tareas", pendiente.resumen.tareas],
                  ["Categorías", pendiente.resumen.categorias],
                  ["Movimientos", pendiente.resumen.movimientos],
                  ["Eventos", pendiente.resumen.eventos],
                ] as const
              ).map(([etq, n]) => (
                <li key={etq} className="flex justify-between gap-2">
                  <span className="text-muted-foreground">{etq}</span>
                  <span className="tabular-nums">{n}</span>
                </li>
              ))}
            </ul>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setPendiente(null)}
              disabled={restaurando}
            >
              Cancelar
            </Button>
            <Button
              disabled={restaurando}
              onClick={async () => {
                if (!pendiente) return;
                const r = pendiente.respaldo;
                setPendiente(null);
                await onRestaurar(r);
              }}
            >
              Restaurar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TarjetaSeccion>
  );
}

const ETIQUETA_ENTIDAD: Record<EntradaBitacora["entidad"], string> = {
  empresa: "Empresa",
  contacto: "Contacto",
  tarea: "Tarea",
  movimiento: "Movimiento",
  categoria: "Categoría",
  evento: "Evento",
  ajustes: "Ajustes",
  respaldo: "Respaldo",
};

const ETIQUETA_ACCION: Record<EntradaBitacora["accion"], string> = {
  crear: "creó",
  editar: "editó",
  eliminar: "eliminó",
  restaurar: "restauró",
};

function SeccionBitacora({ entradas }: { entradas: EntradaBitacora[] }) {
  const [mostrarTodo, setMostrarTodo] = useState(false);
  const visibles = mostrarTodo ? entradas.slice(0, 100) : entradas.slice(0, 15);

  return (
    <TarjetaSeccion
      titulo="Actividad de la aplicación"
      descripcion="Registro de creaciones, ediciones y borrados en todos los módulos."
    >
      {entradas.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <History className="h-4 w-4" />
          Todavía no hay actividad registrada.
        </p>
      ) : (
        <>
          <ol className="space-y-1.5 text-sm">
            {visibles.map((e) => (
              <li key={e.id} className="flex items-baseline gap-2">
                <span className="text-muted-foreground">
                  {ETIQUETA_ACCION[e.accion]}
                </span>
                <span className="rounded bg-muted px-1.5 py-0.5 text-xs">
                  {ETIQUETA_ENTIDAD[e.entidad]}
                </span>
                <span className="min-w-0 flex-1 truncate">{e.resumen}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {formatearFechaHora(e.fecha)}
                </span>
              </li>
            ))}
          </ol>
          {entradas.length > 15 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMostrarTodo((v) => !v)}
            >
              {mostrarTodo ? "Ver menos" : `Ver más (${entradas.length})`}
            </Button>
          )}
        </>
      )}
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
