import type {
  Contacto,
  ContactoInput,
  Empresa,
  EmpresaInput,
} from "@/lib/types";
import { esEstadoValido } from "@/lib/types";
import { parsearMonto } from "@/lib/money";

/** Campos "planos" del contacto principal que se exportan junto a la empresa. */
type CampoContacto = "_contacto" | "_telefono" | "_correo";

interface ColumnaCSV {
  header: string;
  /** Valor a exportar para una empresa (con su contacto principal opcional). */
  valor: (empresa: Empresa, principal: Contacto | undefined) => string;
}

const COLUMNAS: ColumnaCSV[] = [
  { header: "Empresa", valor: (e) => e.nombre },
  { header: "Estado", valor: (e) => e.estado },
  {
    header: "Monto del resultado (MXN)",
    valor: (e) => (e.montoResultado === null ? "" : String(e.montoResultado)),
  },
  { header: "Notas", valor: (e) => e.notas },
  { header: "Contacto", valor: (_e, p) => p?.nombre ?? "" },
  { header: "Teléfono", valor: (_e, p) => p?.telefono ?? "" },
  { header: "Correo", valor: (_e, p) => p?.correo ?? "" },
  { header: "Último contacto", valor: (e) => e.fechaUltimoContacto ?? "" },
  { header: "Próximo seguimiento", valor: (e) => e.fechaProximoSeguimiento ?? "" },
  {
    header: "Requiere seguimiento",
    valor: (e) => (e.requiereSeguimiento ? "Sí" : "No"),
  },
  { header: "Fecha de creación", valor: (e) => e.fechaCreacion },
  { header: "Última actualización", valor: (e) => e.fechaActualizacion },
];

function escaparCampo(valor: unknown): string {
  const texto = valor === null || valor === undefined ? "" : String(valor);
  if (/["\n,;]/.test(texto)) {
    return `"${texto.replace(/"/g, '""')}"`;
  }
  return texto;
}

/** Serializa las empresas a texto CSV (con los datos del contacto principal). */
export function empresasACSV(
  empresas: Empresa[],
  contactos: Contacto[] = [],
): string {
  const principalPorEmpresa = new Map<string, Contacto>();
  for (const c of contactos) {
    if (c.principal && !principalPorEmpresa.has(c.empresaId)) {
      principalPorEmpresa.set(c.empresaId, c);
    }
  }
  const encabezado = COLUMNAS.map((c) => c.header).join(",");
  const filas = empresas.map((empresa) =>
    COLUMNAS.map((c) =>
      escaparCampo(c.valor(empresa, principalPorEmpresa.get(empresa.id))),
    ).join(","),
  );
  return [encabezado, ...filas].join("\r\n");
}

/** Interpreta valores de verdad de un CSV: "sí", "si", "true", "1", "x"... */
function parsearBooleano(texto: string): boolean {
  return ["si", "sí", "true", "1", "x", "verdadero", "y", "yes"].includes(
    texto.trim().toLowerCase(),
  );
}

/** Dispara la descarga de un archivo CSV en el navegador. */
export function descargarCSV(contenido: string, nombreArchivo: string): void {
  // BOM UTF-8 para que Excel respete los acentos.
  const blob = new Blob(["﻿" + contenido], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement("a");
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

/** Analizador de CSV que respeta comillas, saltos de línea y separadores `,` o `;`. */
function parsearCSV(texto: string): string[][] {
  const limpio = texto.replace(/^﻿/, "");
  const filas: string[][] = [];
  let campo = "";
  let fila: string[] = [];
  let entreComillas = false;
  let separador: "," | ";" | null = null;

  for (let i = 0; i < limpio.length; i++) {
    const char = limpio[i];

    if (entreComillas) {
      if (char === '"') {
        if (limpio[i + 1] === '"') {
          campo += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        campo += char;
      }
      continue;
    }

    if (char === '"') {
      entreComillas = true;
    } else if (separador === null && (char === "," || char === ";")) {
      separador = char;
      fila.push(campo);
      campo = "";
    } else if (separador !== null && char === separador) {
      fila.push(campo);
      campo = "";
    } else if (char === "\r") {
      // ignorar; el \n cierra la fila
    } else if (char === "\n") {
      fila.push(campo);
      filas.push(fila);
      fila = [];
      campo = "";
    } else {
      campo += char;
    }
  }

  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo);
    filas.push(fila);
  }

  return filas.filter((f) => f.some((c) => c.trim() !== ""));
}

type CampoEmpresa = keyof EmpresaInput;

const ALIAS_ENCABEZADOS: Record<string, CampoEmpresa | CampoContacto> = {
  empresa: "nombre",
  nombre: "nombre",
  "nombre de la empresa": "nombre",
  estado: "estado",
  "monto del resultado (mxn)": "montoResultado",
  "monto del resultado": "montoResultado",
  "monto resultado": "montoResultado",
  monto: "montoResultado",
  resultado: "montoResultado",
  notas: "notas",
  nota: "notas",
  contacto: "_contacto",
  "nombre del contacto": "_contacto",
  telefono: "_telefono",
  "teléfono": "_telefono",
  correo: "_correo",
  "correo electrónico": "_correo",
  email: "_correo",
  "último contacto": "fechaUltimoContacto",
  "ultimo contacto": "fechaUltimoContacto",
  "fecha del último contacto": "fechaUltimoContacto",
  "próximo seguimiento": "fechaProximoSeguimiento",
  "proximo seguimiento": "fechaProximoSeguimiento",
  "fecha del próximo seguimiento": "fechaProximoSeguimiento",
  "requiere seguimiento": "requiereSeguimiento",
  requiereseguimiento: "requiereSeguimiento",
  "marca seguimiento": "requiereSeguimiento",
  "próximos seguimientos": "requiereSeguimiento",
  "proximos seguimientos": "requiereSeguimiento",
};

export interface ResultadoImportacion {
  empresas: EmpresaInput[];
  /** Contactos (0 o 1 principal) alineados por índice con `empresas`. */
  contactosPorEmpresa: ContactoInput[][];
  totalFilas: number;
  omitidas: number;
}

function normalizarFecha(valor: string): string | null {
  const limpio = valor.trim();
  if (!limpio) return null;
  if (/^\d{4}-\d{2}-\d{2}/.test(limpio)) return limpio.slice(0, 10);
  const m = limpio.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (m) {
    const [, d, mes, a] = m;
    return `${a}-${mes.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const fecha = new Date(limpio);
  if (!Number.isNaN(fecha.getTime())) return fecha.toISOString().slice(0, 10);
  return null;
}

/**
 * Convierte texto CSV en empresas (+ su contacto principal opcional).
 * Requiere al menos la columna "Empresa". Filas sin nombre se omiten.
 */
export function csvAEmpresas(texto: string): ResultadoImportacion {
  const filas = parsearCSV(texto);
  if (filas.length === 0) {
    return { empresas: [], contactosPorEmpresa: [], totalFilas: 0, omitidas: 0 };
  }

  const encabezados = filas[0].map((h) => h.trim().toLowerCase());
  const mapaColumnas = encabezados.map((h) => ALIAS_ENCABEZADOS[h] ?? null);

  const empresas: EmpresaInput[] = [];
  const contactosPorEmpresa: ContactoInput[][] = [];
  let omitidas = 0;

  for (let i = 1; i < filas.length; i++) {
    const celdas = filas[i];
    const emp: Partial<Record<CampoEmpresa, string>> = {};
    const con: Partial<Record<CampoContacto, string>> = {};

    mapaColumnas.forEach((campo, idx) => {
      const val = (celdas[idx] ?? "").trim();
      if (campo === "_contacto" || campo === "_telefono" || campo === "_correo") {
        con[campo] = val;
      } else if (campo) {
        emp[campo] = val;
      }
    });

    const nombre = emp.nombre?.trim();
    if (!nombre) {
      omitidas++;
      continue;
    }

    empresas.push({
      nombre,
      estado: esEstadoValido(emp.estado) ? emp.estado : "Pendiente",
      montoResultado: parsearMonto(emp.montoResultado ?? "").monto,
      notas: emp.notas ?? "",
      fechaUltimoContacto: normalizarFecha(emp.fechaUltimoContacto ?? ""),
      fechaProximoSeguimiento: normalizarFecha(emp.fechaProximoSeguimiento ?? ""),
      requiereSeguimiento: parsearBooleano(emp.requiereSeguimiento ?? ""),
    });

    const nombreC = (con._contacto ?? "").trim();
    const telC = (con._telefono ?? "").trim();
    const correoC = (con._correo ?? "").trim();
    contactosPorEmpresa.push(
      nombreC || telC || correoC
        ? [
            {
              nombre: nombreC,
              puesto: "",
              telefono: telC,
              correo: correoC,
              principal: true,
            },
          ]
        : [],
    );
  }

  return {
    empresas,
    contactosPorEmpresa,
    totalFilas: filas.length - 1,
    omitidas,
  };
}
