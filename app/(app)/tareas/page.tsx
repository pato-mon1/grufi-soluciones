import type { Metadata } from "next";
import { TareasView } from "@/components/tareas/tareas-view";

export const metadata: Metadata = {
  title: "Tareas · GRUFI SOLUCIONES",
};

export default function TareasPage() {
  return <TareasView />;
}
