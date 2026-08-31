import type { Metadata } from "next";
import { CalendarioView } from "@/components/calendario/calendario-view";

export const metadata: Metadata = {
  title: "Calendario · GRUFI SOLUCIONES",
};

export default function CalendarioPage() {
  return <CalendarioView />;
}
