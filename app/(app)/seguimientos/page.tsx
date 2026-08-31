import type { Metadata } from "next";
import { SeguimientosView } from "@/components/seguimientos/seguimientos-view";

export const metadata: Metadata = {
  title: "Seguimientos · GRUFI SOLUCIONES",
};

export default function SeguimientosPage() {
  return <SeguimientosView />;
}
