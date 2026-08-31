import { Hammer } from "lucide-react";
import { PageHeader } from "@/components/app-shell/page-header";
import { Card } from "@/components/ui/card";

interface ModuloProximamenteProps {
  titulo: string;
  resumen: string;
  incluye: string[];
}

/**
 * Página real para un módulo cuya implementación llega en la Fase 2.
 * No es una maqueta con botones decorativos: describe con claridad qué traerá
 * y por qué todavía no está (necesita tablas nuevas en Supabase).
 */
export function ModuloProximamente({
  titulo,
  resumen,
  incluye,
}: ModuloProximamenteProps) {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-6 lg:py-10">
      <PageHeader title={titulo} subtitle={resumen} />
      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-accent">
            <Hammer className="h-5 w-5 text-champagne" />
          </span>
          <div>
            <p className="font-medium">En construcción — Fase 2</p>
            <p className="text-sm text-muted-foreground">
              Necesita tablas nuevas en la base de datos, que se crean con
              migraciones no destructivas.
            </p>
          </div>
        </div>
        <div className="space-y-1.5 border-t pt-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Incluirá
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-muted-foreground">
            {incluye.map((linea) => (
              <li key={linea}>{linea}</li>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
