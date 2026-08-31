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
