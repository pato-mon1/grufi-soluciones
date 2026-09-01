"use client";

import { cn } from "@/lib/utils";
import {
  MODULO_LABEL,
  NIVELES_ACCESO,
  NIVEL_DESCRIPCION,
  NIVEL_LABEL,
  MODULOS,
  PLANTILLAS,
  PLANTILLA_LABEL,
  type AccessLevel,
  type MapaPermisos,
  type PlantillaKey,
} from "@/lib/permisos";

const NIVEL_CLASE: Record<AccessLevel, string> = {
  none: "data-[on=true]:bg-muted data-[on=true]:text-muted-foreground",
  view: "data-[on=true]:bg-estado-avance-suave data-[on=true]:text-estado-avance-fg",
  edit: "data-[on=true]:bg-estado-platicas-suave data-[on=true]:text-estado-platicas-fg",
  manage: "data-[on=true]:bg-estado-ganada/15 data-[on=true]:text-estado-ganada-fg",
};

export function MatrizPermisos({
  valor,
  onChange,
  deshabilitado,
}: {
  valor: MapaPermisos;
  onChange: (m: MapaPermisos) => void;
  deshabilitado?: boolean;
}) {
  const set = (modulo: (typeof MODULOS)[number], nivel: AccessLevel) =>
    onChange({ ...valor, [modulo]: nivel });

  const aplicarPlantilla = (k: PlantillaKey) => {
    if (k === "personalizado") return;
    onChange({ ...valor, ...PLANTILLAS[k] });
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        <span className="self-center text-xs text-muted-foreground">
          Plantilla:
        </span>
        {(Object.keys(PLANTILLA_LABEL) as PlantillaKey[]).map((k) => (
          <button
            key={k}
            type="button"
            disabled={deshabilitado || k === "personalizado"}
            onClick={() => aplicarPlantilla(k)}
            className="rounded-full border px-2.5 py-0.5 text-xs hover:border-champagne disabled:opacity-40"
          >
            {PLANTILLA_LABEL[k]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {MODULOS.map((m) => (
          <div
            key={m}
            className="flex flex-col gap-1.5 rounded-md border p-2 sm:flex-row sm:items-center sm:gap-3"
          >
            <span className="w-32 shrink-0 text-sm font-medium">
              {MODULO_LABEL[m]}
            </span>
            <div className="flex flex-wrap gap-1">
              {NIVELES_ACCESO.map((n) => (
                <button
                  key={n}
                  type="button"
                  disabled={deshabilitado}
                  data-on={valor[m] === n}
                  title={NIVEL_DESCRIPCION[n]}
                  onClick={() => set(m, n)}
                  className={cn(
                    "rounded-md border px-2 py-1 text-xs transition-colors",
                    "data-[on=false]:text-muted-foreground data-[on=false]:hover:border-champagne",
                    NIVEL_CLASE[n],
                    "data-[on=true]:border-transparent data-[on=true]:font-medium",
                  )}
                >
                  {NIVEL_LABEL[n]}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Resumen compacto: cuántos módulos con cada nivel. */
export function ResumenPermisos({ valor }: { valor: MapaPermisos }) {
  const conteo: Record<AccessLevel, string[]> = {
    none: [],
    view: [],
    edit: [],
    manage: [],
  };
  for (const m of MODULOS) conteo[valor[m]].push(MODULO_LABEL[m]);
  return (
    <ul className="space-y-1 text-xs">
      {(["manage", "edit", "view", "none"] as AccessLevel[]).map((n) =>
        conteo[n].length > 0 ? (
          <li key={n}>
            <span className="font-medium">{NIVEL_LABEL[n]}:</span>{" "}
            <span className="text-muted-foreground">
              {conteo[n].join(", ")}
            </span>
          </li>
        ) : null,
      )}
    </ul>
  );
}
