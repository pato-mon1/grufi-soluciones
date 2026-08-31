import type { RolPerfil } from "@/lib/types";

export interface Organizacion {
  id: string;
  nombre: string;
  creadaPor: string;
  fechaCreacion: string;
}

export interface MiembroOrg {
  id: string;
  orgId: string;
  userId: string;
  correo: string;
  rol: RolPerfil;
  fechaCreacion: string;
}

export interface Invitacion {
  id: string;
  orgId: string;
  correo: string;
  rol: RolPerfil;
  estado: "pendiente" | "aceptada" | "cancelada";
  fechaCreacion: string;
}

const ALFABETO_PASS =
  "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Contraseña temporal legible (sin caracteres ambiguos) de la longitud dada. */
export function generarPasswordTemporal(longitud = 12): string {
  const n = Math.max(8, Math.min(64, Math.floor(longitud)));
  let salida = "";
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    const buf = new Uint32Array(n);
    crypto.getRandomValues(buf);
    for (let i = 0; i < n; i++) {
      salida += ALFABETO_PASS[buf[i] % ALFABETO_PASS.length];
    }
  } else {
    for (let i = 0; i < n; i++) {
      salida +=
        ALFABETO_PASS[Math.floor(Math.random() * ALFABETO_PASS.length)];
    }
  }
  return salida;
}

const CORREO_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function correoValido(valor: string): boolean {
  return CORREO_RE.test(valor.trim());
}
