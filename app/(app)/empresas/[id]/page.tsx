import type { Metadata } from "next";
import { FichaEmpresa } from "@/components/empresas/ficha-empresa";

export const metadata: Metadata = {
  title: "Ficha de empresa · GRUFI SOLUCIONES",
};

export default function FichaEmpresaPage({
  params,
}: {
  params: { id: string };
}) {
  return <FichaEmpresa id={params.id} />;
}
