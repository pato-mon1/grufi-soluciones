interface Segmento {
  nombre: string;
  valor: number;
  color: string;
}

/**
 * Rueda (donut) de proporciones con SVG puro — sin librerías de gráficas.
 * Si no hay datos muestra un anillo gris.
 */
export function DonutFinanzas({
  segmentos,
  total,
  etiquetaCentro,
}: {
  segmentos: Segmento[];
  total: number;
  etiquetaCentro?: string;
}) {
  const radio = 42;
  const circunferencia = 2 * Math.PI * radio;
  const conValor = segmentos.filter((s) => s.valor > 0);
  const suma = conValor.reduce((acc, s) => acc + s.valor, 0) || 1;

  let acumulado = 0;
  const arcos = conValor.map((s) => {
    const fraccion = s.valor / suma;
    const arco = {
      color: s.color,
      dash: fraccion * circunferencia,
      offset: -acumulado * circunferencia,
    };
    acumulado += fraccion;
    return arco;
  });

  return (
    <div className="flex items-center gap-4">
      <svg
        viewBox="0 0 100 100"
        className="h-28 w-28 shrink-0 -rotate-90"
        role="img"
        aria-label={etiquetaCentro ?? "Distribución"}
      >
        <circle
          cx="50"
          cy="50"
          r={radio}
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="12"
        />
        {arcos.map((a, i) => (
          <circle
            key={i}
            cx="50"
            cy="50"
            r={radio}
            fill="none"
            stroke={a.color}
            strokeWidth="12"
            strokeDasharray={`${a.dash} ${circunferencia - a.dash}`}
            strokeDashoffset={a.offset}
            strokeLinecap="butt"
          />
        ))}
      </svg>
      <ul className="min-w-0 flex-1 space-y-1 text-sm">
        {conValor.length === 0 && (
          <li className="text-muted-foreground">Sin datos en el periodo.</li>
        )}
        {conValor.map((s) => (
          <li key={s.nombre} className="flex items-center justify-between gap-2">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: s.color }}
              />
              <span className="truncate">{s.nombre}</span>
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {total > 0 ? Math.round((s.valor / total) * 100) : 0}%
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
