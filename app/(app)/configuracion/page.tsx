import type { Metadata } from "next";
import { ConfiguracionView } from "@/components/configuracion/configuracion-view";

export const metadata: Metadata = {
  title: "Configuración · GRUFI SOLUCIONES",
};

export default function ConfiguracionPage() {
  return <ConfiguracionView />;
}
