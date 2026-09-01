/**
 * Permisos por panel (RBAC). El nivel efectivo de cada módulo determina qué
 * puede ver y hacer un colaborador. La barrera real son las políticas RLS y
 * los endpoints del servidor; esto es el espejo en el cliente.
 */

export const MODULOS = [
  "empresas",
  "seguimientos",
  "tareas",
  "calendario",
  "reportes",
  "finanzas",
  "contactos",
  "configuracion",
] as const;
export type ModuleKey = (typeof MODULOS)[number];

export const NIVELES_ACCESO = ["none", "view", "edit", "manage"] as const;
export type AccessLevel = (typeof NIVELES_ACCESO)[number];

export const NIVEL_NUM: Record<AccessLevel, number> = {
  none: 1,
  view: 2,
  edit: 3,
  manage: 4,
};

export const MODULO_LABEL: Record<ModuleKey, string> = {
  empresas: "Empresas",
  seguimientos: "Seguimientos",
  tareas: "Tareas",
  calendario: "Calendario",
  reportes: "Reportes",
  finanzas: "Finanzas",
  contactos: "Contactos",
  configuracion: "Configuración",
};

export const NIVEL_LABEL: Record<AccessLevel, string> = {
  none: "Sin acceso",
  view: "Solo lectura",
  edit: "Edición",
  manage: "Administración",
};

export const NIVEL_DESCRIPCION: Record<AccessLevel, string> = {
  none: "No puede verlo ni abrirlo.",
  view: "Consulta, sin agregar, editar, eliminar ni exportar.",
  edit: "Consulta, crea y modifica; sin eliminar ni configurar.",
  manage: "Acceso completo: eliminar, exportar y administrar.",
};

/** Ruta principal de cada módulo. */
export const RUTA_MODULO: Record<ModuleKey, string> = {
  empresas: "/empresas",
  seguimientos: "/seguimientos",
  tareas: "/tareas",
  calendario: "/calendario",
  reportes: "/reportes",
  finanzas: "/finanzas",
  contactos: "/contactos",
  configuracion: "/configuracion",
};

/** Módulo al que pertenece una ruta interna, o `null` si no aplica guarda. */
export function moduloDeRuta(pathname: string): ModuleKey | null {
  const ruta = pathname.split(/[?#]/)[0];
  for (const m of MODULOS) {
    const base = RUTA_MODULO[m];
    if (ruta === base || ruta.startsWith(`${base}/`)) return m;
  }
  return null;
}

/** ¿`nivel` alcanza el `minimo` pedido? */
export function tieneAcceso(
  nivel: AccessLevel | undefined,
  minimo: AccessLevel,
): boolean {
  return NIVEL_NUM[nivel ?? "none"] >= NIVEL_NUM[minimo];
}

export type MapaPermisos = Record<ModuleKey, AccessLevel>;

function todos(nivel: AccessLevel): MapaPermisos {
  return MODULOS.reduce((acc, m) => {
    acc[m] = nivel;
    return acc;
  }, {} as MapaPermisos);
}

export const PERMISOS_COMPLETOS: MapaPermisos = todos("manage");
export const PERMISOS_VACIOS: MapaPermisos = todos("none");

interface FilaPermiso {
  module_key: string;
  access_level: string;
}

/**
 * Resuelve el mapa efectivo de permisos.
 * - Administrador  -> acceso completo.
 * - Sin ninguna regla registrada -> acceso completo (compatibilidad con
 *   cuentas previas al sistema de permisos).
 * - En otro caso -> el nivel de cada regla; los módulos sin regla quedan en
 *   "none".
 */
export function resolverPermisos(
  filas: FilaPermiso[] | null | undefined,
  esAdmin: boolean,
): MapaPermisos {
  if (esAdmin) return { ...PERMISOS_COMPLETOS };
  if (!filas || filas.length === 0) return { ...PERMISOS_COMPLETOS };
  const mapa = { ...PERMISOS_VACIOS };
  for (const f of filas) {
    if ((MODULOS as readonly string[]).includes(f.module_key)) {
      const nivel = (NIVELES_ACCESO as readonly string[]).includes(f.access_level)
        ? (f.access_level as AccessLevel)
        : "none";
      mapa[f.module_key as ModuleKey] = nivel;
    }
  }
  return mapa;
}

/** Primera ruta que el usuario puede abrir (>= view), o `/configuracion`. */
export function primeraRutaPermitida(permisos: MapaPermisos): string {
  for (const m of MODULOS) {
    if (tieneAcceso(permisos[m], "view")) return RUTA_MODULO[m];
  }
  return "/configuracion";
}

// ── Plantillas rápidas ──────────────────────────────────────

export type PlantillaKey =
  | "admin"
  | "ventas"
  | "finanzas"
  | "colaborador"
  | "personalizado";

export const PLANTILLA_LABEL: Record<PlantillaKey, string> = {
  admin: "Administrador",
  ventas: "Ventas",
  finanzas: "Finanzas",
  colaborador: "Colaborador",
  personalizado: "Personalizado",
};

export const PLANTILLAS: Record<PlantillaKey, MapaPermisos> = {
  admin: todos("manage"),
  ventas: {
    empresas: "edit",
    seguimientos: "edit",
    tareas: "edit",
    calendario: "edit",
    contactos: "edit",
    reportes: "none",
    finanzas: "none",
    configuracion: "none",
  },
  finanzas: {
    finanzas: "manage",
    reportes: "manage",
    empresas: "view",
    seguimientos: "none",
    tareas: "none",
    calendario: "none",
    contactos: "none",
    configuracion: "none",
  },
  colaborador: {
    tareas: "edit",
    calendario: "view",
    empresas: "none",
    seguimientos: "none",
    reportes: "none",
    finanzas: "none",
    contactos: "none",
    configuracion: "none",
  },
  personalizado: todos("none"),
};

/** Rol general -> plantilla base (solo punto de partida). */
export function plantillaDeRol(rol: string): MapaPermisos {
  switch (rol) {
    case "admin":
      return { ...PLANTILLAS.admin };
    case "ventas":
      return { ...PLANTILLAS.ventas };
    case "finanzas":
      return { ...PLANTILLAS.finanzas };
    case "colaborador":
      return { ...PLANTILLAS.colaborador };
    default:
      return { ...PLANTILLAS.personalizado };
  }
}
