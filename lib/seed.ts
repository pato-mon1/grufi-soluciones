import type { EmpresaInput, EstadoEmpresa } from "@/lib/types";

/** Registros de ejemplo que se cargan la primera vez (solo en modo localStorage). */
const REGISTROS_INICIALES: Array<{ nombre: string; estado: EstadoEmpresa }> = [
  { nombre: "Senda", estado: "En avance" },
  { nombre: "Reacciones Químicas", estado: "Pendiente" },
  { nombre: "RAGASA", estado: "En pláticas" },
  { nombre: "ROCA", estado: "Pendiente" },
  { nombre: "Montacargas Gzz", estado: "Pendiente" },
  { nombre: "Grupo GIM", estado: "Futura" },
  { nombre: "Frisa", estado: "Futura" },
  { nombre: "Metalsa", estado: "Futura" },
  { nombre: "Katcon", estado: "Futura" },
  { nombre: "Raycomx", estado: "Futura" },
  { nombre: "ORVEN", estado: "Pendiente" },
  { nombre: "SisaMex", estado: "Futura" },
];

export function crearDatosIniciales(): EmpresaInput[] {
  return REGISTROS_INICIALES.map(({ nombre, estado }) => ({
    nombre,
    estado,
    montoResultado: null,
    notas: "",
    fechaUltimoContacto: null,
    fechaProximoSeguimiento: null,
    requiereSeguimiento: false,
  }));
}
