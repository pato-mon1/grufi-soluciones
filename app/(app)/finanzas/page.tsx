import type { Metadata } from "next";
import { FinanzasView } from "@/components/finanzas/finanzas-view";

export const metadata: Metadata = {
  title: "Finanzas · GRUFI SOLUCIONES",
};

export default function FinanzasPage() {
  return <FinanzasView />;
}
