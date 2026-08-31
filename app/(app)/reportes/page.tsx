import type { Metadata } from "next";
import { ReportesView } from "@/components/reportes/reportes-view";

export const metadata: Metadata = {
  title: "Reportes · GRUFI SOLUCIONES",
};

export default function ReportesPage() {
  return <ReportesView />;
}
