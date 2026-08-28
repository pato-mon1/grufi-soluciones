import type { ContactoInput, EmpresaInput } from "@/lib/types";
import { esEstadoValido } from "@/lib/types";

export type ErroresFormulario = Partial<
  Record<keyof EmpresaInput | "form", string>
>;

export type ErroresContacto = Partial<Record<keyof ContactoInput, string>>;

const REGEX_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Acepta números con espacios, guiones, paréntesis y prefijo +. Entre 7 y 20 caracteres.
const REGEX_TELEFONO = /^\+?[\d\s().-]{7,20}$/;

/** ¿El correo tiene un formato válido? (vacío también es válido) */
export function correoValido(correo: string): boolean {
  const c = correo.trim();
  return c === "" || REGEX_CORREO.test(c);
}

/** ¿El teléfono tiene un formato válido? (vacío también es válido) */
export function telefonoValido(telefono: string): boolean {
  const t = telefono.trim();
  if (t === "") return true;
  return REGEX_TELEFONO.test(t) && t.replace(/\D/g, "").length >= 7;
}

/** Valida los datos del formulario de empresa. Devuelve un objeto de errores (vacío = OK). */
export function validarEmpresa(datos: EmpresaInput): ErroresFormulario {
  const errores: ErroresFormulario = {};

  if (!datos.nombre || datos.nombre.trim().length === 0) {
    errores.nombre = "El nombre de la empresa es obligatorio.";
  } else if (datos.nombre.trim().length < 2) {
    errores.nombre = "El nombre debe tener al menos 2 caracteres.";
  }

  if (!esEstadoValido(datos.estado)) {
    errores.estado = "Selecciona un estado válido.";
  }

  if (datos.montoResultado !== null) {
    if (!Number.isFinite(datos.montoResultado) || datos.montoResultado < 0) {
      errores.montoResultado =
        "Ingresa un monto válido mayor o igual a cero, o déjalo vacío.";
    }
  }

  if (
    datos.fechaUltimoContacto &&
    datos.fechaProximoSeguimiento &&
    datos.fechaProximoSeguimiento < datos.fechaUltimoContacto
  ) {
    errores.fechaProximoSeguimiento =
      "El próximo seguimiento no puede ser anterior al último contacto.";
  }

  return errores;
}

/** Valida un contacto de la sección "Contactos" del formulario. */
export function validarContacto(datos: ContactoInput): ErroresContacto {
  const errores: ErroresContacto = {};

  if (!datos.nombre || datos.nombre.trim().length === 0) {
    errores.nombre = "El nombre del contacto es obligatorio.";
  }
  if (!correoValido(datos.correo)) {
    errores.correo = "El correo no tiene un formato válido.";
  }
  if (!telefonoValido(datos.telefono)) {
    errores.telefono = "El teléfono no tiene un formato válido.";
  }

  return errores;
}

export function tieneErrores(errores: object): boolean {
  return Object.keys(errores).length > 0;
}
