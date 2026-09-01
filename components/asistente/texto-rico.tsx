"use client";

import { Fragment, type ReactNode } from "react";

/**
 * Render mínimo de texto con formato para las respuestas del asistente.
 * Soporta encabezados (#, ##, ###), viñetas (- / *), negritas (**texto**) y
 * párrafos. No ejecuta HTML: todo se renderiza como texto plano de React.
 */

function conNegritas(linea: string, clave: string) {
  const partes = linea.split(/(\*\*[^*]+\*\*)/g);
  return partes.map((p, i) => {
    if (p.startsWith("**") && p.endsWith("**")) {
      return (
        <strong key={`${clave}-${i}`} className="font-semibold text-foreground">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <Fragment key={`${clave}-${i}`}>{p}</Fragment>;
  });
}

export function TextoRico({ texto }: { texto: string }) {
  const lineas = texto.replace(/\r/g, "").split("\n");
  const bloques: ReactNode[] = [];
  let vinetas: string[] = [];

  const cerrarVinetas = (clave: string) => {
    if (vinetas.length === 0) return;
    bloques.push(
      <ul key={`ul-${clave}`} className="my-1.5 ml-4 list-disc space-y-1">
        {vinetas.map((v, i) => (
          <li key={i}>{conNegritas(v, `${clave}-li-${i}`)}</li>
        ))}
      </ul>,
    );
    vinetas = [];
  };

  lineas.forEach((cruda, idx) => {
    const linea = cruda.trimEnd();
    const clave = String(idx);
    const bullet = linea.match(/^\s*[-*]\s+(.*)$/);
    if (bullet) {
      vinetas.push(bullet[1]);
      return;
    }
    cerrarVinetas(clave);

    if (!linea.trim()) return;

    const h = linea.match(/^(#{1,3})\s+(.*)$/);
    if (h) {
      const nivel = h[1].length;
      const contenido = conNegritas(h[2], clave);
      bloques.push(
        nivel === 1 ? (
          <p key={clave} className="mt-2 text-sm font-semibold text-foreground">
            {contenido}
          </p>
        ) : nivel === 2 ? (
          <p
            key={clave}
            className="mt-2 text-[13px] font-semibold uppercase tracking-wide text-muted-foreground"
          >
            {contenido}
          </p>
        ) : (
          <p key={clave} className="mt-1.5 text-sm font-medium text-foreground">
            {contenido}
          </p>
        ),
      );
      return;
    }

    bloques.push(
      <p key={clave} className="my-1 leading-relaxed">
        {conNegritas(linea, clave)}
      </p>,
    );
  });
  cerrarVinetas("fin");

  return <div className="text-sm text-foreground">{bloques}</div>;
}
