import type { Metadata } from "next";
import { ModuloProximamente } from "@/components/modulo-proximamente";

export const metadata: Metadata = {
  title: "Configuración · GRUFI SOLUCIONES",
};

export default function ConfiguracionPage() {
  return (
    <ModuloProximamente
      titulo="Configuración"
      resumen="Ajustes generales, equipo y permisos, estados, notificaciones y respaldos. Solo administradores."
      incluye={[
        "General: nombre, zona horaria America/Monterrey, moneda MXN, formatos de fecha/hora",
        "Equipo y permisos: usuarios, rol Administrador/Miembro, activar/desactivar, invitaciones seguras",
        "Estados: crear/editar nombre, color y orden; proteger los que estén en uso",
        "Notificaciones: recordatorios de seguimientos, tareas, cobros y pagos, con días de anticipación",
        "Finanzas: categorías, moneda, meta anual, saldo inicial",
        "Datos: estado de Supabase, importar/exportar CSV, respaldo JSON y restauración validada",
        "Seguridad: cambiar contraseña, cerrar otras sesiones, cerrar sesión",
      ]}
    />
  );
}
