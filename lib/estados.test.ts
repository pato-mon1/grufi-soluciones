import { describe, expect, it } from "vitest";
import {
  clavesOrdenadas,
  resolverEstados,
  type EstadoOportunidad,
} from "@/lib/estados";

function override(
  p: Partial<EstadoOportunidad> & Pick<EstadoOportunidad, "clave">,
): EstadoOportunidad {
  return {
    etiqueta: "X",
    color: "#123456",
    orden: 0,
    fechaCreacion: "",
    fechaActualizacion: "",
    ...p,
  };
}

describe("resolverEstados", () => {
  it("sin personalizaciones devuelve los 6 valores base", () => {
    const c = resolverEstados([]);
    expect(c["Pendiente"].etiqueta).toBe("Pendiente");
    expect(c["Pendiente"].personalizado).toBe(false);
    expect(c["Cerrada - Ganada"].cerrado).toBe(true);
    expect(c["En avance"].cerrado).toBe(false);
  });

  it("aplica etiqueta, color y orden personalizados", () => {
    const c = resolverEstados([
      override({ clave: "Futura", etiqueta: "Prospecto frío", color: "#aa00bb", orden: 9 }),
    ]);
    expect(c["Futura"].etiqueta).toBe("Prospecto frío");
    expect(c["Futura"].color).toBe("#aa00bb");
    expect(c["Futura"].orden).toBe(9);
    expect(c["Futura"].personalizado).toBe(true);
    // El resto sigue en base
    expect(c["Pendiente"].personalizado).toBe(false);
  });

  it("ignora color inválido y etiqueta vacía (cae a base)", () => {
    const c = resolverEstados([
      override({ clave: "Pendiente", etiqueta: "   ", color: "rojo" }),
    ]);
    expect(c["Pendiente"].etiqueta).toBe("Pendiente");
    expect(c["Pendiente"].color).toBe("#64748B");
  });

  it("nunca cambia el carácter de cierre aunque venga en el override", () => {
    const c = resolverEstados([
      override({ clave: "En avance", etiqueta: "Cerrando" }),
    ]);
    expect(c["En avance"].cerrado).toBe(false);
  });
});

describe("clavesOrdenadas", () => {
  it("respeta el orden personalizado y es estable", () => {
    const c = resolverEstados([
      override({ clave: "Futura", orden: -1 }),
      override({ clave: "Pendiente", orden: 5 }),
    ]);
    const orden = clavesOrdenadas(c);
    expect(orden[0]).toBe("Futura");
    expect(orden.indexOf("Pendiente")).toBeGreaterThan(
      orden.indexOf("En avance"),
    );
    expect(orden).toHaveLength(6);
  });
});
