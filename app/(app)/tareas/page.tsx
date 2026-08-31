import type { Metadata } from "next";
import { ModuloProximamente } from "@/components/modulo-proximamente";

export const metadata: Metadata = { title: "Tareas · GRUFI SOLUCIONES" };

export default function TareasPage() {
  return (
    <ModuloProximamente
      titulo="Tareas"
      resumen="Tablero Kanban de trabajo por hacer, en curso, en revisión y completadas."
      incluye={[
        "Columnas Por hacer / En curso / En revisión / Completadas, con arrastrar y soltar",
        "Tarea con empresa y contacto relacionados, responsable, prioridad, fecha límite y subtareas",
        "Vistas Tablero y Lista, filtros por empresa/responsable/prioridad/fecha",
        "Carga de trabajo por responsable",
        "Las tareas con fecha aparecen también en Calendario",
      ]}
    />
  );
}
