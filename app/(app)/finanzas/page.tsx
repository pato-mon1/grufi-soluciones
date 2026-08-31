import type { Metadata } from "next";
import { ModuloProximamente } from "@/components/modulo-proximamente";

export const metadata: Metadata = { title: "Finanzas · GRUFI SOLUCIONES" };

export default function FinanzasPage() {
  return (
    <ModuloProximamente
      titulo="Finanzas"
      resumen="Ingresos, egresos, utilidad, flujo y rentabilidad por empresa."
      incluye={[
        "Indicadores: saldo en caja, ingresos, egresos, utilidad neta y margen",
        "Ciclo del dinero (Ventas → Cobranza → Caja → Gastos → Utilidad) y resumen ejecutivo",
        "Egresos por categoría configurable y rentabilidad por empresa",
        "Flujo anual con meta y porcentaje alcanzado",
        "Registrar ingreso/egreso, marcar cobrado/pagado, relacionar con empresa",
        "Al ganar una empresa: opción “Crear cobro pendiente” (no se crea el ingreso solo)",
      ]}
    />
  );
}
