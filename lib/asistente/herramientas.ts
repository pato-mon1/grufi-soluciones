import "server-only";

import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { fechaEnZona } from "@/lib/zona";
import {
  tieneAcceso,
  type MapaPermisos,
  type ModuleKey,
} from "@/lib/permisos";
import type { DefinicionHerramientaIA } from "@/lib/asistente/anthropic";
import type { FuenteConsultada } from "@/lib/asistente/tipos";

/**
 * Herramientas internas del Asistente GRUFI.
 *
 * - El modelo NUNCA ejecuta SQL: solo puede llamar estas funciones con
 *   parámetros validados por Zod.
 * - Todas las consultas usan el cliente de Supabase de la SESIÓN del usuario
 *   (RLS activa). Nunca se usa `service_role`.
 * - Cada herramienta declara qué paneles necesita; el motor solo ofrece al
 *   modelo las herramientas permitidas, y además cada herramienta revalida el
 *   permiso al ejecutarse (defensa en profundidad; la RLS es la última barrera).
 * - Se seleccionan solo las columnas necesarias y se limita el número de filas.
 * - El resultado es SIEMPRE estructurado e incluye `fuentes`.
 */

export interface ContextoHerramienta {
  sb: SupabaseClient;
  permisos: MapaPermisos;
  esAdmin: boolean;
  userId: string;
  tz: string;
  ahora: Date;
}

export interface ResultadoHerramienta {
  datos: unknown;
  fuentes: FuenteConsultada[];
}

interface Herramienta {
  nombre: string;
  descripcion: string;
  parametros: z.ZodTypeAny;
  esquemaJson: Record<string, unknown>;
  /** Paneles obligatorios (todos con al menos lectura). */
  requiere: ModuleKey[];
  /** Reemplaza a `requiere` cuando el criterio es "al menos uno". */
  disponible?: (permisos: MapaPermisos, esAdmin: boolean) => boolean;
  ejecutar: (
    args: Record<string, unknown>,
    ctx: ContextoHerramienta,
  ) => Promise<ResultadoHerramienta>;
}

class SinPermiso extends Error {
  constructor() {
    super("SIN_PERMISO");
  }
}

function puede(
  ctx: ContextoHerramienta,
  m: ModuleKey,
  min: "view" | "edit" = "view",
): boolean {
  return ctx.esAdmin || tieneAcceso(ctx.permisos[m], min);
}
function exigir(ctx: ContextoHerramienta, m: ModuleKey) {
  if (!puede(ctx, m)) throw new SinPermiso();
}

const LIMITE_MAX = 25;
function clamp(n: unknown, def: number, max = LIMITE_MAX): number {
  const v = Math.trunc(Number(n));
  if (!Number.isFinite(v) || v <= 0) return def;
  return Math.min(v, max);
}

function hoyEnZona(ctx: ContextoHerramienta): string {
  return fechaEnZona(ctx.ahora.toISOString(), ctx.tz);
}
function sumarDias(ymd: string, dias: number): string {
  const d = new Date(`${ymd}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

const ESTADOS_ABIERTOS = [
  "Pendiente",
  "En pláticas",
  "En avance",
  "Futura",
];
const ETIQUETA_ESTADO_TAREA: Record<string, string> = {
  por_hacer: "Por hacer",
  en_curso: "En curso",
  en_revision: "En revisión",
  completada: "Completada",
};

// ── Utilidades de datos ─────────────────────────────────────

async function nombresUsuarios(
  ctx: ContextoHerramienta,
  ids: Array<string | null | undefined>,
): Promise<Map<string, string>> {
  const unicos = Array.from(
    new Set(ids.filter((x): x is string => Boolean(x))),
  );
  const mapa = new Map<string, string>();
  if (unicos.length === 0) return mapa;
  const { data } = await ctx.sb
    .from("perfiles")
    .select("user_id, nombre, correo")
    .in("user_id", unicos);
  for (const p of (data ?? []) as Array<Record<string, unknown>>) {
    const nombre =
      String(p.nombre ?? "").trim() ||
      String(p.correo ?? "").split("@")[0] ||
      "Colaborador";
    mapa.set(p.user_id as string, nombre);
  }
  return mapa;
}

interface EmpresaMin {
  id: string;
  nombre: string;
  estado: string;
  monto_resultado: number | string | null;
  notas: string | null;
  fecha_ultimo_contacto: string | null;
  fecha_proximo_seguimiento: string | null;
  requiere_seguimiento: boolean | null;
  fecha_actualizacion: string;
}

async function resolverEmpresa(
  ctx: ContextoHerramienta,
  args: { proyectoId?: string; nombre?: string },
): Promise<
  | { tipo: "ok"; empresa: EmpresaMin }
  | { tipo: "no_encontrada" }
  | { tipo: "ambigua"; opciones: Array<{ id: string; nombre: string; estado: string }> }
> {
  const cols =
    "id, nombre, estado, monto_resultado, notas, fecha_ultimo_contacto, fecha_proximo_seguimiento, requiere_seguimiento, fecha_actualizacion";
  if (args.proyectoId) {
    const { data } = await ctx.sb
      .from("empresas")
      .select(cols)
      .eq("id", args.proyectoId)
      .maybeSingle();
    if (!data) return { tipo: "no_encontrada" };
    return { tipo: "ok", empresa: data as EmpresaMin };
  }
  const texto = String(args.nombre ?? "").trim();
  if (!texto) return { tipo: "no_encontrada" };
  const { data } = await ctx.sb
    .from("empresas")
    .select(cols)
    .ilike("nombre", `%${texto}%`)
    .order("fecha_actualizacion", { ascending: false })
    .limit(6);
  const filas = (data ?? []) as EmpresaMin[];
  if (filas.length === 0) return { tipo: "no_encontrada" };
  const exacta = filas.find(
    (f) => f.nombre.toLowerCase() === texto.toLowerCase(),
  );
  if (exacta) return { tipo: "ok", empresa: exacta };
  if (filas.length === 1) return { tipo: "ok", empresa: filas[0] };
  return {
    tipo: "ambigua",
    opciones: filas.map((f) => ({
      id: f.id,
      nombre: f.nombre,
      estado: f.estado,
    })),
  };
}

interface TareaMin {
  id: string;
  titulo: string;
  estado: string;
  prioridad: string;
  asignado_a: string | null;
  vence_en: string | null;
  fecha_limite: string | null;
  empresa_id: string | null;
  fecha_completada: string | null;
}

function vencimiento(t: TareaMin): string | null {
  if (t.vence_en) return t.vence_en.slice(0, 10);
  return t.fecha_limite;
}
function tareaVencida(t: TareaMin, hoy: string): boolean {
  if (t.estado === "completada") return false;
  const v = vencimiento(t);
  return Boolean(v && v < hoy);
}

// ── Herramientas ────────────────────────────────────────────

const buscarProyectos: Herramienta = {
  nombre: "buscar_proyectos",
  descripcion:
    "Busca proyectos (empresas / oportunidades) por nombre o estado. Devuelve una lista breve con nombre, estado, fechas de seguimiento y última actualización. Úsala para localizar el proyecto correcto antes de pedir un resumen, o para preguntas como '¿qué proyectos están en avance?'.",
  parametros: z.object({
    texto: z.string().trim().max(120).optional(),
    estado: z
      .enum([
        "Pendiente",
        "En pláticas",
        "En avance",
        "Futura",
        "Cerrada - Ganada",
        "Cerrada - No concretada",
      ])
      .optional(),
    limite: z.number().int().positive().max(25).optional(),
  }),
  esquemaJson: {
    type: "object",
    properties: {
      texto: { type: "string", description: "Parte del nombre del proyecto." },
      estado: {
        type: "string",
        enum: [
          "Pendiente",
          "En pláticas",
          "En avance",
          "Futura",
          "Cerrada - Ganada",
          "Cerrada - No concretada",
        ],
      },
      limite: { type: "integer", minimum: 1, maximum: 25 },
    },
  },
  requiere: ["empresas"],
  async ejecutar(args, ctx) {
    exigir(ctx, "empresas");
    const limite = clamp(args.limite, 10);
    let q = ctx.sb
      .from("empresas")
      .select(
        "id, nombre, estado, requiere_seguimiento, fecha_proximo_seguimiento, fecha_ultimo_contacto, fecha_actualizacion",
      );
    if (typeof args.texto === "string" && args.texto.trim()) {
      q = q.ilike("nombre", `%${args.texto.trim()}%`);
    }
    if (typeof args.estado === "string") q = q.eq("estado", args.estado);
    const { data, error } = await q
      .order("fecha_actualizacion", { ascending: false })
      .limit(limite);
    if (error) throw new Error(error.message);
    const filas = (data ?? []) as Array<Record<string, unknown>>;
    return {
      datos: {
        total: filas.length,
        proyectos: filas.map((f) => ({
          id: f.id,
          nombre: f.nombre,
          estado: f.estado,
          proximoSeguimiento: f.fecha_proximo_seguimiento ?? null,
          marcadoParaSeguimiento: Boolean(f.requiere_seguimiento),
          ultimoContacto: f.fecha_ultimo_contacto ?? null,
          ultimaActualizacion: f.fecha_actualizacion,
        })),
      },
      fuentes: filas.slice(0, 6).map((f) => ({
        etiqueta: `Proyecto ${String(f.nombre)}`,
        tipo: "proyecto" as const,
        href: `/empresas/${String(f.id)}`,
      })),
    };
  },
};

async function armarResumenProyecto(
  ctx: ContextoHerramienta,
  empresa: EmpresaMin,
  incluirSiguiente: boolean,
): Promise<ResultadoHerramienta> {
  const hoy = hoyEnZona(ctx);
  const fuentes: FuenteConsultada[] = [
    {
      etiqueta: `Proyecto ${empresa.nombre}`,
      tipo: "proyecto",
      href: `/empresas/${empresa.id}`,
    },
  ];

  // Actividades recientes (panel Empresas).
  const { data: actData } = await ctx.sb
    .from("actividades")
    .select("tipo, descripcion, fecha_hora")
    .eq("empresa_id", empresa.id)
    .order("fecha_hora", { ascending: false })
    .limit(5);
  const actividades = (actData ?? []) as Array<Record<string, unknown>>;

  // Tareas del proyecto (solo si tiene acceso a Tareas).
  let avance: {
    porcentaje: number | null;
    calculado: boolean;
    completadas: number;
    total: number;
  } = { porcentaje: null, calculado: false, completadas: 0, total: 0 };
  let pendientes: Array<Record<string, unknown>> = [];
  let proximaTarea: Record<string, unknown> | null = null;
  let vencidas = 0;
  let responsable: string | null = null;
  let fechaLimite: string | null = null;
  const verTareas = puede(ctx, "tareas");

  if (verTareas) {
    const { data: tData } = await ctx.sb
      .from("tareas")
      .select(
        "id, titulo, estado, prioridad, asignado_a, vence_en, fecha_limite, empresa_id, fecha_completada",
      )
      .eq("empresa_id", empresa.id)
      .limit(200);
    const tareas = (tData ?? []) as TareaMin[];
    const total = tareas.length;
    const completadas = tareas.filter((t) => t.estado === "completada").length;
    avance = {
      total,
      completadas,
      calculado: total > 0,
      porcentaje: total > 0 ? Math.round((completadas / total) * 100) : null,
    };
    const abiertas = tareas
      .filter((t) => t.estado !== "completada")
      .sort((a, b) =>
        (vencimiento(a) ?? "9999").localeCompare(vencimiento(b) ?? "9999"),
      );
    vencidas = abiertas.filter((t) => tareaVencida(t, hoy)).length;
    const nombres = await nombresUsuarios(
      ctx,
      tareas.map((t) => t.asignado_a),
    );
    // Responsable = quien tiene más tareas asignadas en el proyecto.
    const conteo = new Map<string, number>();
    for (const t of tareas) {
      if (t.asignado_a) conteo.set(t.asignado_a, (conteo.get(t.asignado_a) ?? 0) + 1);
    }
    const top = [...conteo.entries()].sort((a, b) => b[1] - a[1])[0];
    responsable = top ? (nombres.get(top[0]) ?? null) : null;
    pendientes = abiertas.slice(0, 6).map((t) => ({
      titulo: t.titulo,
      estado: ETIQUETA_ESTADO_TAREA[t.estado] ?? t.estado,
      prioridad: t.prioridad,
      vence: vencimiento(t),
      vencida: tareaVencida(t, hoy),
      responsable: t.asignado_a ? (nombres.get(t.asignado_a) ?? null) : null,
    }));
    const prox = abiertas.find((t) => vencimiento(t));
    fechaLimite = prox ? vencimiento(prox) : null;
    proximaTarea = prox
      ? {
          titulo: prox.titulo,
          vence: vencimiento(prox),
          responsable: prox.asignado_a
            ? (nombres.get(prox.asignado_a) ?? null)
            : null,
        }
      : null;
    if (total > 0) {
      fuentes.push({
        etiqueta: "Tareas del proyecto",
        tipo: "tareas",
        href: `/tareas?empresa=${empresa.id}`,
      });
    }
  }

  // Próximo evento de calendario del proyecto.
  let proximoEvento: Record<string, unknown> | null = null;
  if (puede(ctx, "calendario")) {
    const { data: evData } = await ctx.sb
      .from("eventos_calendario")
      .select("titulo, inicio, tipo")
      .eq("empresa_id", empresa.id)
      .gte("inicio", ctx.ahora.toISOString())
      .order("inicio", { ascending: true })
      .limit(1);
    const ev = (evData ?? [])[0] as Record<string, unknown> | undefined;
    if (ev) {
      proximoEvento = { titulo: ev.titulo, inicio: ev.inicio, tipo: ev.tipo };
      fuentes.push({
        etiqueta: "Calendario del proyecto",
        tipo: "calendario",
        href: `/calendario`,
      });
    }
  }

  // Finanzas del proyecto (solo si tiene acceso a Finanzas).
  let finanzas: Record<string, unknown> | null = null;
  if (puede(ctx, "finanzas")) {
    const { data: mData } = await ctx.sb
      .from("movimientos_financieros")
      .select("tipo, monto, estado")
      .eq("empresa_id", empresa.id)
      .limit(500);
    const movs = (mData ?? []) as Array<Record<string, unknown>>;
    let cobrado = 0;
    let pagado = 0;
    let porCobrar = 0;
    let porPagar = 0;
    for (const m of movs) {
      const monto = Number(m.monto) || 0;
      if (m.estado === "liquidado") {
        if (m.tipo === "ingreso") cobrado += monto;
        else pagado += monto;
      } else if (m.estado === "pendiente") {
        if (m.tipo === "ingreso") porCobrar += monto;
        else porPagar += monto;
      }
    }
    finanzas = {
      montoResultadoRegistrado:
        empresa.monto_resultado === null || empresa.monto_resultado === undefined
          ? null
          : Number(empresa.monto_resultado),
      cobrado,
      pagado,
      utilidad: Math.round((cobrado - pagado) * 100) / 100,
      porCobrar,
      porPagar,
      moneda: "MXN",
    };
    if (movs.length > 0) {
      fuentes.push({
        etiqueta: "Finanzas del proyecto",
        tipo: "finanzas",
        href: `/finanzas`,
      });
    }
  }

  // Clasificación de estado del proyecto (sin inventar: según los datos).
  const segVencido =
    Boolean(empresa.fecha_proximo_seguimiento) &&
    (empresa.fecha_proximo_seguimiento as string) < hoy &&
    ESTADOS_ABIERTOS.includes(empresa.estado);
  const segCercano =
    Boolean(empresa.fecha_proximo_seguimiento) &&
    (empresa.fecha_proximo_seguimiento as string) <= sumarDias(hoy, 3);
  const sinDatos =
    avance.total === 0 &&
    !empresa.fecha_proximo_seguimiento &&
    actividades.length === 0;
  let clasificacion:
    | "en_tiempo"
    | "requiere_atencion"
    | "atrasado"
    | "sin_informacion_suficiente";
  if (sinDatos) clasificacion = "sin_informacion_suficiente";
  else if (vencidas > 0 || segVencido) clasificacion = "atrasado";
  else if (segCercano || (fechaLimite && fechaLimite <= sumarDias(hoy, 3)))
    clasificacion = "requiere_atencion";
  else clasificacion = "en_tiempo";

  if (empresa.fecha_proximo_seguimiento) {
    fuentes.push({
      etiqueta: "Próximo seguimiento",
      tipo: "seguimientos",
      href: `/seguimientos`,
    });
  }
  if (actividades.length > 0) {
    fuentes.push({
      etiqueta: "Actividad reciente",
      tipo: "actividad",
      href: `/empresas/${empresa.id}`,
    });
  }

  const datos: Record<string, unknown> = {
    proyecto: empresa.nombre,
    empresaRelacionada: empresa.nombre,
    estadoActual: empresa.estado,
    clasificacion,
    avance: {
      porcentaje: avance.porcentaje,
      calculadoAutomaticamente: avance.calculado,
      formula: avance.calculado
        ? `${avance.completadas} de ${avance.total} tareas completadas`
        : null,
      nota: verTareas
        ? avance.calculado
          ? "Porcentaje calculado a partir de las tareas del proyecto."
          : "No hay tareas registradas para calcular el avance."
        : "Sin acceso al panel de Tareas para calcular el avance.",
    },
    responsable: responsable ?? "Sin responsable asignado en las tareas.",
    ultimaActualizacion: empresa.fecha_actualizacion,
    ultimoContacto: empresa.fecha_ultimo_contacto ?? null,
    notas: (empresa.notas ?? "").slice(0, 1200) || null,
    actividadesRecientes: actividades.map((a) => ({
      tipo: a.tipo,
      descripcion: a.descripcion,
      fecha: a.fecha_hora,
    })),
    tareasPendientes: verTareas
      ? pendientes
      : "Sin acceso al panel de Tareas.",
    proximaActividad: incluirSiguiente
      ? (proximaTarea ?? proximoEvento ?? null)
      : (proximaTarea ?? null),
    proximoEvento,
    proximoSeguimiento: empresa.fecha_proximo_seguimiento ?? null,
    fechaLimite,
    alertas: [
      ...(vencidas > 0
        ? [`Hay ${vencidas} tarea(s) vencida(s) en el proyecto.`]
        : []),
      ...(segVencido
        ? [
            `El seguimiento programado (${empresa.fecha_proximo_seguimiento}) ya venció.`,
          ]
        : []),
    ],
    finanzas: finanzas ?? "Sin acceso al panel de Finanzas.",
    enlace: `/empresas/${empresa.id}`,
  };

  return { datos, fuentes };
}

const resumenProyecto: Herramienta = {
  nombre: "resumen_proyecto",
  descripcion:
    "Devuelve el estado completo de un proyecto: estado, avance (calculado con tareas completadas ÷ total si no hay uno guardado), responsable, última actualización, actividades recientes, tareas pendientes, próxima actividad, próximo seguimiento, fecha límite, alertas y (si el usuario tiene permiso) montos. Indica cuándo el avance es calculado. Si hay dos proyectos con nombre parecido, devuelve la lista para que preguntes cuál.",
  parametros: z
    .object({
      proyectoId: z.string().uuid().optional(),
      nombre: z.string().trim().max(120).optional(),
    })
    .refine((v) => v.proyectoId || v.nombre, {
      message: "Indica proyectoId o nombre.",
    }),
  esquemaJson: {
    type: "object",
    properties: {
      proyectoId: { type: "string", description: "UUID del proyecto/empresa." },
      nombre: { type: "string", description: "Nombre o parte del nombre." },
    },
  },
  requiere: ["empresas"],
  async ejecutar(args, ctx) {
    exigir(ctx, "empresas");
    const r = await resolverEmpresa(ctx, {
      proyectoId: args.proyectoId as string | undefined,
      nombre: args.nombre as string | undefined,
    });
    if (r.tipo === "no_encontrada") {
      return { datos: { encontrado: false }, fuentes: [] };
    }
    if (r.tipo === "ambigua") {
      return {
        datos: {
          ambiguo: true,
          mensaje:
            "Hay varios proyectos con un nombre parecido. Pide al usuario que elija uno.",
          opciones: r.opciones,
        },
        fuentes: r.opciones.slice(0, 6).map((o) => ({
          etiqueta: `Proyecto ${o.nombre}`,
          tipo: "proyecto" as const,
          href: `/empresas/${o.id}`,
        })),
      };
    }
    return armarResumenProyecto(ctx, r.empresa, false);
  },
};

const siguientePasoProyecto: Herramienta = {
  nombre: "siguiente_paso_proyecto",
  descripcion:
    "Responde '¿qué sigue?' para un proyecto: siguiente tarea pendiente, la de mayor prioridad, la fecha más próxima, el responsable, seguimientos programados, tareas vencidas que deben resolverse primero y bloqueos. Si no hay una siguiente actividad registrada, dilo explícitamente.",
  parametros: z
    .object({
      proyectoId: z.string().uuid().optional(),
      nombre: z.string().trim().max(120).optional(),
    })
    .refine((v) => v.proyectoId || v.nombre, {
      message: "Indica proyectoId o nombre.",
    }),
  esquemaJson: {
    type: "object",
    properties: {
      proyectoId: { type: "string" },
      nombre: { type: "string" },
    },
  },
  requiere: ["empresas"],
  async ejecutar(args, ctx) {
    exigir(ctx, "empresas");
    const r = await resolverEmpresa(ctx, {
      proyectoId: args.proyectoId as string | undefined,
      nombre: args.nombre as string | undefined,
    });
    if (r.tipo === "no_encontrada") return { datos: { encontrado: false }, fuentes: [] };
    if (r.tipo === "ambigua") {
      return {
        datos: { ambiguo: true, opciones: r.opciones },
        fuentes: r.opciones.slice(0, 6).map((o) => ({
          etiqueta: `Proyecto ${o.nombre}`,
          tipo: "proyecto" as const,
          href: `/empresas/${o.id}`,
        })),
      };
    }
    const empresa = r.empresa;
    const hoy = hoyEnZona(ctx);
    const fuentes: FuenteConsultada[] = [
      {
        etiqueta: `Proyecto ${empresa.nombre}`,
        tipo: "proyecto",
        href: `/empresas/${empresa.id}`,
      },
    ];

    let siguiente: Record<string, unknown> | null = null;
    let mayorPrioridad: Record<string, unknown> | null = null;
    let vencidasPrimero: Array<Record<string, unknown>> = [];
    if (puede(ctx, "tareas")) {
      const { data } = await ctx.sb
        .from("tareas")
        .select(
          "id, titulo, estado, prioridad, asignado_a, vence_en, fecha_limite, empresa_id, fecha_completada",
        )
        .eq("empresa_id", empresa.id)
        .neq("estado", "completada")
        .limit(200);
      const abiertas = (data ?? []) as TareaMin[];
      const nombres = await nombresUsuarios(
        ctx,
        abiertas.map((t) => t.asignado_a),
      );
      const conFecha = [...abiertas]
        .filter((t) => vencimiento(t))
        .sort((a, b) =>
          (vencimiento(a) ?? "").localeCompare(vencimiento(b) ?? ""),
        );
      const prio = { alta: 0, media: 1, baja: 2 } as Record<string, number>;
      const porPrioridad = [...abiertas].sort(
        (a, b) => (prio[a.prioridad] ?? 3) - (prio[b.prioridad] ?? 3),
      );
      const fmt = (t: TareaMin) => ({
        titulo: t.titulo,
        estado: ETIQUETA_ESTADO_TAREA[t.estado] ?? t.estado,
        prioridad: t.prioridad,
        vence: vencimiento(t),
        vencida: tareaVencida(t, hoy),
        responsable: t.asignado_a ? (nombres.get(t.asignado_a) ?? null) : null,
      });
      siguiente = conFecha[0] ? fmt(conFecha[0]) : (abiertas[0] ? fmt(abiertas[0]) : null);
      mayorPrioridad = porPrioridad[0] ? fmt(porPrioridad[0]) : null;
      vencidasPrimero = abiertas
        .filter((t) => tareaVencida(t, hoy))
        .sort((a, b) => (vencimiento(a) ?? "").localeCompare(vencimiento(b) ?? ""))
        .slice(0, 5)
        .map(fmt);
      if (abiertas.length > 0) {
        fuentes.push({
          etiqueta: "Tareas del proyecto",
          tipo: "tareas",
          href: `/tareas?empresa=${empresa.id}`,
        });
      }
    }

    const seguimientoProgramado =
      empresa.fecha_proximo_seguimiento &&
      ESTADOS_ABIERTOS.includes(empresa.estado)
        ? {
            fecha: empresa.fecha_proximo_seguimiento,
            vencido: (empresa.fecha_proximo_seguimiento as string) < hoy,
          }
        : null;
    if (seguimientoProgramado) {
      fuentes.push({
        etiqueta: "Próximo seguimiento",
        tipo: "seguimientos",
        href: `/seguimientos`,
      });
    }

    const haySiguiente =
      siguiente || seguimientoProgramado || vencidasPrimero.length > 0;

    return {
      datos: {
        proyecto: empresa.nombre,
        tienePanelTareas: puede(ctx, "tareas"),
        siguienteTarea: siguiente,
        tareaMayorPrioridad: mayorPrioridad,
        tareasVencidasQueResolverPrimero: vencidasPrimero,
        seguimientoProgramado,
        bloqueos:
          vencidasPrimero.length > 0
            ? ["Hay tareas vencidas que conviene resolver antes de continuar."]
            : [],
        sinSiguienteRegistrado: !haySiguiente,
        mensajeSiSinSiguiente:
          "No hay una siguiente actividad registrada para este proyecto.",
        enlaceProyecto: `/empresas/${empresa.id}`,
        enlaceTareas: `/tareas?empresa=${empresa.id}`,
      },
      fuentes,
    };
  },
};

const tareasPendientes: Herramienta = {
  nombre: "tareas_pendientes",
  descripcion:
    "Lista tareas no completadas. Filtra por alcance ('vencidas', 'proximos_7_dias' o 'todas') y opcionalmente por el nombre del responsable. Úsala para '¿qué tareas vencen esta semana?', '¿qué pendientes tiene Cano?', '¿qué tareas están atrasadas?'.",
  parametros: z.object({
    alcance: z.enum(["vencidas", "proximos_7_dias", "todas"]).optional(),
    responsableNombre: z.string().trim().max(80).optional(),
    limite: z.number().int().positive().max(25).optional(),
  }),
  esquemaJson: {
    type: "object",
    properties: {
      alcance: {
        type: "string",
        enum: ["vencidas", "proximos_7_dias", "todas"],
      },
      responsableNombre: { type: "string" },
      limite: { type: "integer", minimum: 1, maximum: 25 },
    },
  },
  requiere: ["tareas"],
  async ejecutar(args, ctx) {
    exigir(ctx, "tareas");
    const hoy = hoyEnZona(ctx);
    const alcance = (args.alcance as string) || "proximos_7_dias";
    const limite = clamp(args.limite, 15);

    let filtroResponsable: string | null = null;
    if (typeof args.responsableNombre === "string" && args.responsableNombre.trim()) {
      const t = args.responsableNombre.trim();
      const { data: perf } = await ctx.sb
        .from("perfiles")
        .select("user_id, nombre, correo")
        .or(`nombre.ilike.%${t}%,correo.ilike.%${t}%`)
        .limit(1);
      const p = (perf ?? [])[0] as Record<string, unknown> | undefined;
      if (!p) {
        return {
          datos: {
            responsableNoEncontrado: t,
            mensaje:
              "No se encontró un colaborador con ese nombre. Pide al usuario que lo confirme.",
          },
          fuentes: [],
        };
      }
      filtroResponsable = p.user_id as string;
    }

    let q = ctx.sb
      .from("tareas")
      .select(
        "id, titulo, estado, prioridad, asignado_a, vence_en, fecha_limite, empresa_id, fecha_completada",
      )
      .neq("estado", "completada");
    if (filtroResponsable) q = q.eq("asignado_a", filtroResponsable);
    const { data, error } = await q.limit(200);
    if (error) throw new Error(error.message);
    let filas = (data ?? []) as TareaMin[];

    if (alcance === "vencidas") {
      filas = filas.filter((t) => tareaVencida(t, hoy));
    } else if (alcance === "proximos_7_dias") {
      const limiteFecha = sumarDias(hoy, 7);
      filas = filas.filter((t) => {
        const v = vencimiento(t);
        return v !== null && v <= limiteFecha;
      });
    }
    filas.sort((a, b) =>
      (vencimiento(a) ?? "9999").localeCompare(vencimiento(b) ?? "9999"),
    );
    filas = filas.slice(0, limite);

    const nombres = await nombresUsuarios(ctx, filas.map((t) => t.asignado_a));
    const empresaIds = Array.from(
      new Set(filas.map((t) => t.empresa_id).filter((x): x is string => Boolean(x))),
    );
    const empresaNombre = new Map<string, string>();
    if (empresaIds.length > 0 && puede(ctx, "empresas")) {
      const { data: emp } = await ctx.sb
        .from("empresas")
        .select("id, nombre")
        .in("id", empresaIds);
      for (const e of (emp ?? []) as Array<Record<string, unknown>>) {
        empresaNombre.set(e.id as string, e.nombre as string);
      }
    }

    return {
      datos: {
        alcance,
        hoy,
        total: filas.length,
        tareas: filas.map((t) => ({
          titulo: t.titulo,
          estado: ETIQUETA_ESTADO_TAREA[t.estado] ?? t.estado,
          prioridad: t.prioridad,
          vence: vencimiento(t),
          vencida: tareaVencida(t, hoy),
          responsable: t.asignado_a ? (nombres.get(t.asignado_a) ?? null) : null,
          proyecto: t.empresa_id ? (empresaNombre.get(t.empresa_id) ?? null) : null,
          enlace: `/tareas?tarea=${t.id}`,
        })),
      },
      fuentes: [
        { etiqueta: "Tareas pendientes", tipo: "tareas", href: "/tareas" },
      ],
    };
  },
};

const cargaEquipo: Herramienta = {
  nombre: "carga_equipo",
  descripcion:
    "Resume cuántas tareas abiertas y cuántas vencidas tiene cada responsable. Úsala para '¿quién tiene más tareas atrasadas?' o '¿cómo está la carga del equipo?'. Solo cuenta tareas; no expone roles ni permisos.",
  parametros: z.object({}),
  esquemaJson: { type: "object", properties: {} },
  requiere: ["tareas"],
  async ejecutar(_args, ctx) {
    exigir(ctx, "tareas");
    const hoy = hoyEnZona(ctx);
    const { data, error } = await ctx.sb
      .from("tareas")
      .select("estado, asignado_a, vence_en, fecha_limite, fecha_completada, titulo")
      .neq("estado", "completada")
      .limit(500);
    if (error) throw new Error(error.message);
    const filas = (data ?? []) as TareaMin[];
    const nombres = await nombresUsuarios(ctx, filas.map((t) => t.asignado_a));
    const acc = new Map<string, { abiertas: number; vencidas: number }>();
    let sinAsignar = 0;
    for (const t of filas) {
      if (!t.asignado_a) {
        sinAsignar += 1;
        continue;
      }
      const clave = t.asignado_a;
      const reg = acc.get(clave) ?? { abiertas: 0, vencidas: 0 };
      reg.abiertas += 1;
      if (tareaVencida(t, hoy)) reg.vencidas += 1;
      acc.set(clave, reg);
    }
    const equipo = [...acc.entries()]
      .map(([id, v]) => ({
        responsable: nombres.get(id) ?? "Colaborador",
        tareasAbiertas: v.abiertas,
        tareasVencidas: v.vencidas,
      }))
      .sort(
        (a, b) =>
          b.tareasVencidas - a.tareasVencidas ||
          b.tareasAbiertas - a.tareasAbiertas,
      );
    return {
      datos: { hoy, equipo, tareasSinAsignar: sinAsignar },
      fuentes: [{ etiqueta: "Tareas del equipo", tipo: "tareas", href: "/tareas" }],
    };
  },
};

const proximosSeguimientos: Herramienta = {
  nombre: "proximos_seguimientos",
  descripcion:
    "Lista los proyectos con seguimiento próximo o vencido (fecha de próximo seguimiento o marca manual). Úsala para '¿qué empresas necesitan seguimiento?' y '¿cuáles son los próximos seguimientos?'.",
  parametros: z.object({
    dias: z.number().int().positive().max(120).optional(),
    limite: z.number().int().positive().max(25).optional(),
  }),
  esquemaJson: {
    type: "object",
    properties: {
      dias: { type: "integer", minimum: 1, maximum: 120 },
      limite: { type: "integer", minimum: 1, maximum: 25 },
    },
  },
  requiere: ["empresas"],
  async ejecutar(args, ctx) {
    exigir(ctx, "empresas");
    const hoy = hoyEnZona(ctx);
    const dias = clamp(args.dias, 14, 120);
    const limite = clamp(args.limite, 15);
    const hasta = sumarDias(hoy, dias);
    const { data, error } = await ctx.sb
      .from("empresas")
      .select(
        "id, nombre, estado, requiere_seguimiento, fecha_proximo_seguimiento, fecha_ultimo_contacto",
      )
      .or(
        `fecha_proximo_seguimiento.lte.${hasta},requiere_seguimiento.eq.true`,
      )
      .limit(120);
    if (error) throw new Error(error.message);
    const filas = ((data ?? []) as Array<Record<string, unknown>>)
      .filter((f) => !String(f.estado).startsWith("Cerrada"))
      .map((f) => {
        const fps = (f.fecha_proximo_seguimiento as string | null) ?? null;
        return {
          id: f.id as string,
          nombre: f.nombre as string,
          estado: f.estado as string,
          proximoSeguimiento: fps,
          vencido: Boolean(fps && fps < hoy),
          marcadoManualmente: Boolean(f.requiere_seguimiento),
          ultimoContacto: (f.fecha_ultimo_contacto as string | null) ?? null,
        };
      })
      .sort((a, b) =>
        (a.proximoSeguimiento ?? "9999").localeCompare(
          b.proximoSeguimiento ?? "9999",
        ),
      )
      .slice(0, limite);
    return {
      datos: { hoy, ventanaDias: dias, total: filas.length, seguimientos: filas },
      fuentes: [
        { etiqueta: "Seguimientos", tipo: "seguimientos", href: "/seguimientos" },
        ...filas.slice(0, 4).map((f) => ({
          etiqueta: `Proyecto ${f.nombre}`,
          tipo: "proyecto" as const,
          href: `/empresas/${f.id}`,
        })),
      ],
    };
  },
};

const actividadReciente: Herramienta = {
  nombre: "actividad_reciente",
  descripcion:
    "Devuelve los cambios recientes (últimos N días) de los paneles a los que el usuario tiene acceso: actividades de empresas y/o historial de tareas. Úsala para '¿qué cambió esta semana?'.",
  parametros: z.object({
    dias: z.number().int().positive().max(60).optional(),
    limite: z.number().int().positive().max(25).optional(),
  }),
  esquemaJson: {
    type: "object",
    properties: {
      dias: { type: "integer", minimum: 1, maximum: 60 },
      limite: { type: "integer", minimum: 1, maximum: 25 },
    },
  },
  requiere: [],
  disponible: (p, admin) =>
    admin ||
    tieneAcceso(p.empresas, "view") ||
    tieneAcceso(p.tareas, "view") ||
    tieneAcceso(p.finanzas, "view"),
  async ejecutar(args, ctx) {
    const dias = clamp(args.dias, 7, 60);
    const limite = clamp(args.limite, 15);
    const desde = new Date(
      ctx.ahora.getTime() - dias * 86_400_000,
    ).toISOString();
    const eventos: Array<Record<string, unknown>> = [];
    const fuentes: FuenteConsultada[] = [];

    if (puede(ctx, "empresas")) {
      const { data } = await ctx.sb
        .from("actividades")
        .select("tipo, descripcion, fecha_hora, empresa_id")
        .gte("fecha_hora", desde)
        .order("fecha_hora", { ascending: false })
        .limit(40);
      const filas = (data ?? []) as Array<Record<string, unknown>>;
      const ids = Array.from(
        new Set(filas.map((f) => f.empresa_id).filter((x): x is string => Boolean(x))),
      );
      const nombre = new Map<string, string>();
      if (ids.length > 0) {
        const { data: emp } = await ctx.sb
          .from("empresas")
          .select("id, nombre")
          .in("id", ids);
        for (const e of (emp ?? []) as Array<Record<string, unknown>>)
          nombre.set(e.id as string, e.nombre as string);
      }
      for (const f of filas) {
        eventos.push({
          fuente: "empresa",
          fecha: f.fecha_hora,
          resumen: `${f.tipo}: ${f.descripcion}`,
          proyecto: f.empresa_id ? (nombre.get(f.empresa_id as string) ?? null) : null,
        });
      }
      if (filas.length > 0)
        fuentes.push({
          etiqueta: "Actividad de empresas",
          tipo: "actividad",
          href: "/empresas",
        });
    }

    if (puede(ctx, "tareas")) {
      const { data } = await ctx.sb
        .from("actividad_tarea")
        .select("accion, fecha_creacion, tarea_id, actor_id")
        .gte("fecha_creacion", desde)
        .order("fecha_creacion", { ascending: false })
        .limit(40);
      const filas = (data ?? []) as Array<Record<string, unknown>>;
      const nombres = await nombresUsuarios(
        ctx,
        filas.map((f) => f.actor_id as string | null),
      );
      for (const f of filas) {
        eventos.push({
          fuente: "tarea",
          fecha: f.fecha_creacion,
          resumen: String(f.accion),
          actor: f.actor_id ? (nombres.get(f.actor_id as string) ?? null) : null,
          enlace: f.tarea_id ? `/tareas?tarea=${f.tarea_id}` : "/tareas",
        });
      }
      if (filas.length > 0)
        fuentes.push({
          etiqueta: "Historial de tareas",
          tipo: "tareas",
          href: "/tareas",
        });
    }

    eventos.sort((a, b) =>
      String(b.fecha).localeCompare(String(a.fecha)),
    );

    return {
      datos: {
        ventanaDias: dias,
        total: eventos.length,
        cambios: eventos.slice(0, limite),
      },
      fuentes,
    };
  },
};

const resumenFinanciero: Herramienta = {
  nombre: "resumen_financiero",
  descripcion:
    "Resumen financiero de un periodo: ingresos cobrados, gastos pagados, utilidad, cuentas por cobrar y por pagar, y saldo en caja. Periodos: 'mes_actual', 'mes_pasado', 'anio' o 'rango' con desde/hasta (YYYY-MM-DD). Requiere permiso al panel Finanzas.",
  parametros: z
    .object({
      periodo: z.enum(["mes_actual", "mes_pasado", "anio", "rango"]).optional(),
      desde: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
      hasta: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    })
    .optional(),
  esquemaJson: {
    type: "object",
    properties: {
      periodo: {
        type: "string",
        enum: ["mes_actual", "mes_pasado", "anio", "rango"],
      },
      desde: { type: "string", description: "YYYY-MM-DD (solo con periodo=rango)" },
      hasta: { type: "string", description: "YYYY-MM-DD (solo con periodo=rango)" },
    },
  },
  requiere: ["finanzas"],
  async ejecutar(args, ctx) {
    exigir(ctx, "finanzas");
    const hoy = hoyEnZona(ctx);
    const [y, m] = hoy.split("-").map(Number);
    const periodo = (args.periodo as string) || "mes_actual";
    let desde = `${hoy.slice(0, 7)}-01`;
    let hasta = hoy;
    if (periodo === "mes_pasado") {
      const pm = m === 1 ? 12 : m - 1;
      const py = m === 1 ? y - 1 : y;
      desde = `${py}-${String(pm).padStart(2, "0")}-01`;
      const fin = new Date(Date.UTC(py, pm, 0));
      hasta = fin.toISOString().slice(0, 10);
    } else if (periodo === "anio") {
      desde = `${y}-01-01`;
      hasta = `${y}-12-31`;
    } else if (periodo === "rango") {
      if (typeof args.desde === "string") desde = args.desde;
      if (typeof args.hasta === "string") hasta = args.hasta;
    }

    const { data, error } = await ctx.sb
      .from("movimientos_financieros")
      .select("tipo, monto, estado, fecha, concepto, empresa_id")
      .limit(2000);
    if (error) throw new Error(error.message);
    const movs = (data ?? []) as Array<Record<string, unknown>>;

    let ingresos = 0;
    let egresos = 0;
    let porCobrar = 0;
    let porPagar = 0;
    let saldo = 0;
    const cobrosPendientes: Array<Record<string, unknown>> = [];
    for (const mv of movs) {
      const monto = Number(mv.monto) || 0;
      const f = String(mv.fecha).slice(0, 10);
      const enRango = f >= desde && f <= hasta;
      if (mv.estado === "liquidado") {
        saldo += mv.tipo === "ingreso" ? monto : -monto;
        if (enRango) {
          if (mv.tipo === "ingreso") ingresos += monto;
          else egresos += monto;
        }
      } else if (mv.estado === "pendiente") {
        if (mv.tipo === "ingreso") {
          porCobrar += monto;
          cobrosPendientes.push({
            concepto: mv.concepto,
            monto,
            vence: f,
          });
        } else porPagar += monto;
      }
    }
    const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

    return {
      datos: {
        periodo,
        desde,
        hasta,
        moneda: "MXN",
        ingresosCobrados: r2(ingresos),
        gastosPagados: r2(egresos),
        utilidad: r2(ingresos - egresos),
        margenPorcentaje: ingresos > 0 ? r2(((ingresos - egresos) / ingresos) * 100) : 0,
        cuentasPorCobrar: r2(porCobrar),
        cuentasPorPagar: r2(porPagar),
        saldoEnCajaAproximado: r2(saldo),
        notaSaldo:
          "Saldo = movimientos liquidados; no incluye el saldo inicial configurado en Ajustes.",
        principalesCobrosPendientes: cobrosPendientes
          .sort((a, b) => Number(b.monto) - Number(a.monto))
          .slice(0, 5),
      },
      fuentes: [
        { etiqueta: "Finanzas", tipo: "finanzas", href: "/finanzas" },
        { etiqueta: "Reportes", tipo: "finanzas", href: "/reportes" },
      ],
    };
  },
};

const buscarContactos: Herramienta = {
  nombre: "buscar_contactos",
  descripcion:
    "Busca contactos autorizados por nombre, puesto o empresa. Devuelve nombre, puesto, teléfono, correo y empresa. Requiere permiso al panel Contactos.",
  parametros: z.object({
    texto: z.string().trim().max(120).optional(),
    empresaNombre: z.string().trim().max(120).optional(),
    limite: z.number().int().positive().max(25).optional(),
  }),
  esquemaJson: {
    type: "object",
    properties: {
      texto: { type: "string" },
      empresaNombre: { type: "string" },
      limite: { type: "integer", minimum: 1, maximum: 25 },
    },
  },
  requiere: ["contactos"],
  async ejecutar(args, ctx) {
    exigir(ctx, "contactos");
    const limite = clamp(args.limite, 10);
    let empresaId: string | null = null;
    if (typeof args.empresaNombre === "string" && args.empresaNombre.trim()) {
      const { data } = await ctx.sb
        .from("empresas")
        .select("id, nombre")
        .ilike("nombre", `%${args.empresaNombre.trim()}%`)
        .limit(1);
      empresaId = ((data ?? [])[0]?.id as string) ?? null;
    }
    let q = ctx.sb
      .from("contactos")
      .select("id, nombre, puesto, telefono, correo, principal, empresa_id");
    if (empresaId) q = q.eq("empresa_id", empresaId);
    if (typeof args.texto === "string" && args.texto.trim()) {
      const t = args.texto.trim();
      q = q.or(`nombre.ilike.%${t}%,puesto.ilike.%${t}%,correo.ilike.%${t}%`);
    }
    const { data, error } = await q.limit(limite);
    if (error) throw new Error(error.message);
    const filas = (data ?? []) as Array<Record<string, unknown>>;
    const ids = Array.from(
      new Set(filas.map((f) => f.empresa_id).filter((x): x is string => Boolean(x))),
    );
    const nombre = new Map<string, string>();
    if (ids.length > 0) {
      const { data: emp } = await ctx.sb
        .from("empresas")
        .select("id, nombre")
        .in("id", ids);
      for (const e of (emp ?? []) as Array<Record<string, unknown>>)
        nombre.set(e.id as string, e.nombre as string);
    }
    return {
      datos: {
        total: filas.length,
        contactos: filas.map((f) => ({
          nombre: f.nombre,
          puesto: f.puesto || null,
          telefono: f.telefono || null,
          correo: f.correo || null,
          principal: Boolean(f.principal),
          empresa: f.empresa_id ? (nombre.get(f.empresa_id as string) ?? null) : null,
        })),
      },
      fuentes: [
        { etiqueta: "Contactos", tipo: "contactos", href: "/contactos" },
      ],
    };
  },
};

export const HERRAMIENTAS: Herramienta[] = [
  buscarProyectos,
  resumenProyecto,
  siguientePasoProyecto,
  tareasPendientes,
  cargaEquipo,
  proximosSeguimientos,
  actividadReciente,
  resumenFinanciero,
  buscarContactos,
];

/** Herramientas que el usuario puede usar según sus permisos. */
export function herramientasPermitidas(
  permisos: MapaPermisos,
  esAdmin: boolean,
): Herramienta[] {
  return HERRAMIENTAS.filter((h) => {
    if (h.disponible) return h.disponible(permisos, esAdmin);
    return h.requiere.every((m) => esAdmin || tieneAcceso(permisos[m], "view"));
  });
}

/** Definiciones para el proveedor de IA (solo las permitidas). */
export function definicionesIA(
  permisos: MapaPermisos,
  esAdmin: boolean,
): DefinicionHerramientaIA[] {
  return herramientasPermitidas(permisos, esAdmin).map((h) => ({
    name: h.nombre,
    description: h.descripcion,
    input_schema: h.esquemaJson,
  }));
}

export interface SalidaEjecucion {
  ok: boolean;
  datos?: unknown;
  error?: string;
  fuentes: FuenteConsultada[];
}

/** Ejecuta una herramienta por nombre, validando permisos y parámetros. */
export async function ejecutarHerramienta(
  nombre: string,
  entrada: unknown,
  ctx: ContextoHerramienta,
): Promise<SalidaEjecucion> {
  const h = HERRAMIENTAS.find((x) => x.nombre === nombre);
  if (!h) {
    return { ok: false, error: "Herramienta desconocida.", fuentes: [] };
  }
  // Permiso a nivel de herramienta (defensa en profundidad).
  const permitida = h.disponible
    ? h.disponible(ctx.permisos, ctx.esAdmin)
    : h.requiere.every((m) => puede(ctx, m));
  if (!permitida) {
    return {
      ok: false,
      error:
        "No tienes permiso para consultar esta información. Responde exactamente: “No tienes permiso para consultar esta información.” y no reveles datos, conteos ni nombres.",
      fuentes: [],
    };
  }
  const parseo = h.parametros.safeParse(entrada ?? {});
  if (!parseo.success) {
    return {
      ok: false,
      error: `Parámetros inválidos: ${parseo.error.issues
        .map((i) => i.message)
        .join("; ")}`,
      fuentes: [],
    };
  }
  try {
    const res = await h.ejecutar(
      (parseo.data ?? {}) as Record<string, unknown>,
      ctx,
    );
    return { ok: true, datos: res.datos, fuentes: res.fuentes };
  } catch (e) {
    if (e instanceof SinPermiso) {
      return {
        ok: false,
        error:
          "No tienes permiso para consultar esta información. Responde exactamente: “No tienes permiso para consultar esta información.”",
        fuentes: [],
      };
    }
    return {
      ok: false,
      error:
        e instanceof Error
          ? `No se pudo consultar la información: ${e.message}`
          : "No se pudo consultar la información.",
      fuentes: [],
    };
  }
}
