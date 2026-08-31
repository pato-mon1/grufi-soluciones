import { describe, expect, it } from "vitest";
import { correoValido, generarPasswordTemporal } from "@/lib/equipo";

describe("correoValido", () => {
  it("acepta correos con formato válido", () => {
    expect(correoValido("persona@empresa.com")).toBe(true);
    expect(correoValido("  a.b-c@sub.dominio.mx ")).toBe(true);
  });
  it("rechaza lo que no es un correo", () => {
    expect(correoValido("")).toBe(false);
    expect(correoValido("persona")).toBe(false);
    expect(correoValido("persona@empresa")).toBe(false);
    expect(correoValido("a b@empresa.com")).toBe(false);
  });
});

describe("generarPasswordTemporal", () => {
  it("respeta la longitud pedida dentro de los límites", () => {
    expect(generarPasswordTemporal(12)).toHaveLength(12);
    expect(generarPasswordTemporal(4)).toHaveLength(8); // mínimo 8
    expect(generarPasswordTemporal(100)).toHaveLength(64); // máximo 64
  });
  it("no usa caracteres ambiguos y no se repite", () => {
    const p = generarPasswordTemporal(20);
    expect(p).not.toMatch(/[0O1lI]/);
    expect(generarPasswordTemporal()).not.toBe(generarPasswordTemporal());
  });
});
