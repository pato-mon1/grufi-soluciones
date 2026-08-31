import type { Metadata } from "next";
import { ModuloProximamente } from "@/components/modulo-proximamente";

export const metadata: Metadata = { title: "Calendario · GRUFI SOLUCIONES" };

export default function CalendarioPage() {
  return (
    <ModuloProximamente
      titulo="Calendario"
      resumen="Vistas de mes, semana y día que combinan seguimientos, tareas y movimientos."
      incluye={[
        "Vistas Mes / Semana / Día",
        "Combina seguimientos, reuniones, tareas, cobros y pagos próximos, y eventos propios",
        "Color por tipo, crear/editar/reagendar/eliminar, abrir el elemento relacionado",
        "Filtros por tipo, empresa y responsable",
        "Paneles: próximos eventos, elementos sin fecha y resumen del mes",
      ]}
    />
  );
}
