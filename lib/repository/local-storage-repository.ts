import {
  STORAGE_KEY,
  STORAGE_KEY_ACTIVIDADES,
  STORAGE_KEY_CONTACTOS,
} from "@/lib/constants";
import { crearDatosIniciales } from "@/lib/seed";
import { parsearMonto } from "@/lib/money";
import type {
  Actividad,
  Contacto,
  ContactoInput,
  Empresa,
  EmpresaInput,
  NuevaActividad,
} from "@/lib/types";
import { generarId } from "@/lib/utils";
import type { EmpresaRepository } from "@/lib/repository/types";

function ahora(): string {
  return new Date().toISOString();
}

// ── Lectura / escritura crudas ──────────────────────────────

function leerArreglo<T>(clave: string): T[] {
  if (typeof window === "undefined") return [];
  const crudo = window.localStorage.getItem(clave);
  if (!crudo) return [];
  try {
    const datos = JSON.parse(crudo);
    return Array.isArray(datos) ? (datos as T[]) : [];
  } catch {
    return [];
  }
}

function escribirArreglo(clave: string, valor: unknown[]): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(clave, JSON.stringify(valor));
}

function existeClave(clave: string): boolean {
  if (typeof window === "undefined") return true;
  return window.localStorage.getItem(clave) !== null;
}

// ── Migración segura de la estructura guardada ──────────────

/**
 * Normaliza los registros guardados por versiones anteriores sin perder datos:
 *  - `resultado` (texto) -> `montoResultado` (número | null)
 *  - se agrega `requiereSeguimiento` (por defecto `false`)
 *  - los campos de contacto único `contacto` / `telefono` / `correo` se
 *    convierten en un contacto PRINCIPAL en el nuevo almacén de contactos.
 *
 * Es idempotente: al terminar borra los campos legados de la empresa, por lo
 * que ejecutarla de nuevo no duplica contactos.
 */
function migrarLocal(): { empresas: Empresa[]; contactos: Contacto[] } {
  const brutos = leerArreglo<Record<string, unknown>>(STORAGE_KEY).filter(
    (r) => typeof r === "object" && r !== null,
  );
  const contactos = leerArreglo<Contacto>(STORAGE_KEY_CONTACTOS);
  let cambioEmpresas = false;
  let cambioContactos = false;

  const empresas = brutos.map((registro) => {
    const e: Record<string, unknown> = { ...registro };

    // resultado -> montoResultado
    if (e.montoResultado === undefined) {
      const legado = e.resultado;
      if (typeof legado === "number") {
        e.montoResultado =
          Number.isFinite(legado) && legado >= 0 ? legado : null;
      } else if (typeof legado === "string") {
        e.montoResultado = parsearMonto(legado).monto;
      } else {
        e.montoResultado = null;
      }
      cambioEmpresas = true;
    } else if (typeof e.montoResultado === "string") {
      e.montoResultado = parsearMonto(e.montoResultado).monto;
      cambioEmpresas = true;
    }
    if ("resultado" in e) {
      delete e.resultado;
      cambioEmpresas = true;
    }

    // requiereSeguimiento
    if (typeof e.requiereSeguimiento !== "boolean") {
      e.requiereSeguimiento = e.requiereSeguimiento === true;
      cambioEmpresas = true;
    }

    // contacto único -> contacto principal
    const nombreC = typeof e.contacto === "string" ? e.contacto.trim() : "";
    const telC = typeof e.telefono === "string" ? e.telefono.trim() : "";
    const correoC = typeof e.correo === "string" ? e.correo.trim() : "";
    const tieneLegado = nombreC !== "" || telC !== "" || correoC !== "";
    if ("contacto" in e || "telefono" in e || "correo" in e) {
      const empresaId = String(e.id);
      const yaTieneContactos = contactos.some((c) => c.empresaId === empresaId);
      if (tieneLegado && !yaTieneContactos) {
        // Si contiene "/" se conserva el texto completo como un solo contacto.
        const marca = ahora();
        contactos.push({
          id: generarId(),
          empresaId,
          nombre: nombreC,
          puesto: "",
          telefono: telC,
          correo: correoC,
          principal: true,
          fechaCreacion: marca,
          fechaActualizacion: marca,
        });
        cambioContactos = true;
      }
      delete e.contacto;
      delete e.telefono;
      delete e.correo;
      cambioEmpresas = true;
    }

    return e as unknown as Empresa;
  });

  if (cambioEmpresas) escribirArreglo(STORAGE_KEY, empresas);
  if (cambioContactos) escribirArreglo(STORAGE_KEY_CONTACTOS, contactos);

  return { empresas, contactos };
}

function ordenarEmpresas(empresas: Empresa[]): Empresa[] {
  return [...empresas].sort((a, b) =>
    b.fechaCreacion.localeCompare(a.fechaCreacion),
  );
}

function construirEmpresa(input: EmpresaInput): Empresa {
  const marca = ahora();
  return {
    ...input,
    nombre: input.nombre.trim(),
    id: generarId(),
    fechaCreacion: marca,
    fechaActualizacion: marca,
  };
}

/** Latencia mínima para que los estados de carga sean perceptibles. */
function demora<T>(valor: T): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(valor), 120));
}

class LocalStorageRepository implements EmpresaRepository {
  readonly nombre = "localStorage";

  // ── Empresas ──

  async list(): Promise<Empresa[]> {
    if (!existeClave(STORAGE_KEY)) {
      // Primera ejecución: sembrar los 12 ejemplos.
      const iniciales = crearDatosIniciales().map(construirEmpresa);
      escribirArreglo(STORAGE_KEY, iniciales);
      return demora(ordenarEmpresas(iniciales));
    }
    const { empresas } = migrarLocal();
    return demora(ordenarEmpresas(empresas));
  }

  async create(input: EmpresaInput): Promise<Empresa> {
    const { empresas } = migrarLocal();
    const empresa = construirEmpresa(input);
    escribirArreglo(STORAGE_KEY, [empresa, ...empresas]);
    return demora(empresa);
  }

  async bulkCreate(inputs: EmpresaInput[]): Promise<Empresa[]> {
    const { empresas } = migrarLocal();
    const nuevas = inputs.map(construirEmpresa);
    escribirArreglo(STORAGE_KEY, [...nuevas, ...empresas]);
    return demora(nuevas);
  }

  async update(id: string, cambios: Partial<EmpresaInput>): Promise<Empresa> {
    const { empresas } = migrarLocal();
    const indice = empresas.findIndex((e) => e.id === id);
    if (indice === -1) {
      throw new Error("No se encontró la empresa que intentas actualizar.");
    }
    const actualizada: Empresa = {
      ...empresas[indice],
      ...cambios,
      nombre: (cambios.nombre ?? empresas[indice].nombre).trim(),
      fechaActualizacion: ahora(),
    };
    empresas[indice] = actualizada;
    escribirArreglo(STORAGE_KEY, empresas);
    return demora(actualizada);
  }

  async remove(id: string): Promise<void> {
    const { empresas, contactos } = migrarLocal();
    escribirArreglo(
      STORAGE_KEY,
      empresas.filter((e) => e.id !== id),
    );
    // Borrado en cascada de contactos y actividades.
    escribirArreglo(
      STORAGE_KEY_CONTACTOS,
      contactos.filter((c) => c.empresaId !== id),
    );
    escribirArreglo(
      STORAGE_KEY_ACTIVIDADES,
      leerArreglo<Actividad>(STORAGE_KEY_ACTIVIDADES).filter(
        (a) => a.empresaId !== id,
      ),
    );
    await demora(null);
  }

  // ── Contactos ──

  async listContactos(): Promise<Contacto[]> {
    const { contactos } = migrarLocal();
    return demora(contactos);
  }

  async crearContacto(
    empresaId: string,
    input: ContactoInput,
  ): Promise<Contacto> {
    const { contactos } = migrarLocal();
    const marca = ahora();
    const nuevo: Contacto = {
      id: generarId(),
      empresaId,
      nombre: input.nombre.trim(),
      puesto: input.puesto.trim(),
      telefono: input.telefono.trim(),
      correo: input.correo.trim(),
      principal: Boolean(input.principal),
      fechaCreacion: marca,
      fechaActualizacion: marca,
    };
    let lista = [...contactos, nuevo];
    if (nuevo.principal) lista = desmarcarOtrosPrincipales(lista, empresaId, nuevo.id);
    escribirArreglo(STORAGE_KEY_CONTACTOS, lista);
    return demora(nuevo);
  }

  async actualizarContacto(
    id: string,
    cambios: Partial<ContactoInput>,
  ): Promise<Contacto> {
    const { contactos } = migrarLocal();
    const indice = contactos.findIndex((c) => c.id === id);
    if (indice === -1) {
      throw new Error("No se encontró el contacto que intentas actualizar.");
    }
    const actualizado: Contacto = {
      ...contactos[indice],
      ...cambios,
      fechaActualizacion: ahora(),
    };
    contactos[indice] = actualizado;
    let lista = contactos;
    if (actualizado.principal) {
      lista = desmarcarOtrosPrincipales(
        contactos,
        actualizado.empresaId,
        actualizado.id,
      );
    }
    escribirArreglo(STORAGE_KEY_CONTACTOS, lista);
    return demora(actualizado);
  }

  async eliminarContacto(id: string): Promise<void> {
    const { contactos } = migrarLocal();
    escribirArreglo(
      STORAGE_KEY_CONTACTOS,
      contactos.filter((c) => c.id !== id),
    );
    await demora(null);
  }

  // ── Actividades ──

  async listActividades(): Promise<Actividad[]> {
    return demora(leerArreglo<Actividad>(STORAGE_KEY_ACTIVIDADES));
  }

  async crearActividad(input: NuevaActividad): Promise<Actividad> {
    const lista = leerArreglo<Actividad>(STORAGE_KEY_ACTIVIDADES);
    const actividad: Actividad = {
      id: generarId(),
      empresaId: input.empresaId,
      tipo: input.tipo,
      fechaHora: input.fechaHora,
      descripcion: input.descripcion.trim(),
      fechaCreacion: ahora(),
      usuario: "local",
    };
    escribirArreglo(STORAGE_KEY_ACTIVIDADES, [actividad, ...lista]);
    return demora(actividad);
  }
}

/**
 * Instantánea de todo lo guardado localmente (migrado al formato actual),
 * SIN sembrar las 12 empresas de ejemplo. Se usa para la migración a Supabase.
 */
export function leerSnapshotLocal(): {
  empresas: Empresa[];
  contactos: Contacto[];
  actividades: Actividad[];
} {
  if (!existeClave(STORAGE_KEY)) {
    return { empresas: [], contactos: [], actividades: [] };
  }
  const { empresas, contactos } = migrarLocal();
  return {
    empresas,
    contactos,
    actividades: leerArreglo<Actividad>(STORAGE_KEY_ACTIVIDADES),
  };
}

/** Deja solo `principalId` como principal dentro de su empresa. */
function desmarcarOtrosPrincipales(
  contactos: Contacto[],
  empresaId: string,
  principalId: string,
): Contacto[] {
  return contactos.map((c) =>
    c.empresaId === empresaId && c.id !== principalId && c.principal
      ? { ...c, principal: false, fechaActualizacion: ahora() }
      : c,
  );
}

export const localStorageRepository = new LocalStorageRepository();
