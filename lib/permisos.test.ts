import { describe, expect, it } from "vitest";
import {
  moduloDeRuta,
  plantillaDeRol,
  PLANTILLAS,
  primeraRutaPermitida,
  resolverPermisos,
  tieneAcceso,
} from "@/lib/permisos";

describe("tieneAcceso", () => {
  it("compara niveles jerárquicamente", () => {
    expect(tieneAcceso("manage", "view")).toBe(true);
    expect(tieneAcceso("edit", "edit")).toBe(true);
    expect(tieneAcceso("view", "edit")).toBe(false);
    expect(tieneAcceso("none", "view")).toBe(false);
    expect(tieneAcceso(undefined, "view")).toBe(false);
  });
});

describe("resolverPermisos", () => {
  it("un administrador tiene acceso completo", () => {
    const p = resolverPermisos([], true);
    expect(p.finanzas).toBe("manage");
    expect(p.configuracion).toBe("manage");
  });

  it("sin reglas registradas => acceso completo (compatibilidad)", () => {
    const p = resolverPermisos(null, false);
    expect(p.empresas).toBe("manage");
  });

  it("con reglas => aplica cada nivel y el resto queda en none", () => {
    const p = resolverPermisos(
      [
        { module_key: "empresas", access_level: "view" },
        { module_key: "tareas", access_level: "edit" },
        { module_key: "seguimientos", access_level: "edit" },
      ],
      false,
    );
    expect(p.empresas).toBe("view");
    expect(p.tareas).toBe("edit");
    expect(p.finanzas).toBe("none");
    expect(p.reportes).toBe("none");
    expect(p.configuracion).toBe("none");
  });

  it("ignora claves o niveles desconocidos", () => {
    const p = resolverPermisos(
      [
        { module_key: "inventado", access_level: "manage" },
        { module_key: "tareas", access_level: "raro" },
      ],
      false,
    );
    expect(p.tareas).toBe("none");
  });
});

describe("primeraRutaPermitida", () => {
  it("devuelve el primer módulo con al menos lectura", () => {
    const p = resolverPermisos(
      [
        { module_key: "empresas", access_level: "none" },
        { module_key: "seguimientos", access_level: "none" },
        { module_key: "tareas", access_level: "view" },
      ],
      false,
    );
    expect(primeraRutaPermitida(p)).toBe("/tareas");
  });

  it("cae a /configuracion si no hay ninguno", () => {
    const p = resolverPermisos(
      [{ module_key: "empresas", access_level: "none" }],
      false,
    );
    expect(primeraRutaPermitida(p)).toBe("/configuracion");
  });
});

describe("moduloDeRuta", () => {
  it("mapea rutas base y anidadas", () => {
    expect(moduloDeRuta("/empresas")).toBe("empresas");
    expect(moduloDeRuta("/empresas/abc-123")).toBe("empresas");
    expect(moduloDeRuta("/finanzas")).toBe("finanzas");
    expect(moduloDeRuta("/tareas?tarea=1")).toBe("tareas");
    expect(moduloDeRuta("/")).toBeNull();
  });
});

describe("plantillas", () => {
  it("Ventas no toca Finanzas ni Reportes ni Configuración", () => {
    expect(PLANTILLAS.ventas.finanzas).toBe("none");
    expect(PLANTILLAS.ventas.reportes).toBe("none");
    expect(PLANTILLAS.ventas.configuracion).toBe("none");
    expect(PLANTILLAS.ventas.empresas).toBe("edit");
  });

  it("Finanzas: manage en finanzas/reportes, view en empresas", () => {
    expect(PLANTILLAS.finanzas.finanzas).toBe("manage");
    expect(PLANTILLAS.finanzas.reportes).toBe("manage");
    expect(PLANTILLAS.finanzas.empresas).toBe("view");
  });

  it("Colaborador: solo tareas y calendario", () => {
    expect(PLANTILLAS.colaborador.tareas).toBe("edit");
    expect(PLANTILLAS.colaborador.calendario).toBe("view");
    expect(PLANTILLAS.colaborador.empresas).toBe("none");
  });

  it("plantillaDeRol mapea el rol general", () => {
    expect(plantillaDeRol("admin").finanzas).toBe("manage");
    expect(plantillaDeRol("colaborador").tareas).toBe("edit");
    expect(plantillaDeRol("personalizado").empresas).toBe("none");
  });
});
