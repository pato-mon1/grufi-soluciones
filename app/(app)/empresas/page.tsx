import type { Metadata } from "next";
import { Dashboard } from "@/components/empresas/dashboard";

export const metadata: Metadata = {
  title: "Empresas · GRUFI SOLUCIONES",
};

export default function EmpresasPage() {
  return <Dashboard />;
}
