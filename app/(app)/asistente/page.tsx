import type { Metadata } from "next";
import { AsistenteView } from "@/components/asistente/asistente-view";

export const metadata: Metadata = {
  title: "Asistente GRUFI · GRUFI SOLUCIONES",
};

export default function AsistentePage() {
  return <AsistenteView />;
}
