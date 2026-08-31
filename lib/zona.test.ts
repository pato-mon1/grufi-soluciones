import { describe, expect, it } from "vitest";
import {
  fechaEnZona,
  horaEnZona,
  inicioDiaUtcISO,
  muroAUtcISO,
  offsetZonaMs,
} from "@/lib/zona";

const MTY = "America/Monterrey"; // UTC-6 fijo (sin horario de verano desde 2022)

describe("offsetZonaMs", () => {
  it("Monterrey está 6 horas detrás de UTC", () => {
    const d = new Date("2026-06-18T12:00:00.000Z");
    expect(offsetZonaMs(d, MTY)).toBe(-6 * 3_600_000);
  });

  it("UTC no tiene offset", () => {
    expect(offsetZonaMs(new Date("2026-01-01T00:00:00Z"), "UTC")).toBe(0);
  });
});

describe("muroAUtcISO", () => {
  it("09:30 en Monterrey son las 15:30 UTC", () => {
    expect(muroAUtcISO("2026-06-18", "09:30", MTY)).toBe(
      "2026-06-18T15:30:00.000Z",
    );
  });

  it("respeta el horario de verano de zonas que lo usan", () => {
    // Nueva York en junio está en EDT (UTC-4)
    expect(muroAUtcISO("2026-06-18", "09:30", "America/New_York")).toBe(
      "2026-06-18T13:30:00.000Z",
    );
    // ...y en enero en EST (UTC-5)
    expect(muroAUtcISO("2026-01-18", "09:30", "America/New_York")).toBe(
      "2026-01-18T14:30:00.000Z",
    );
  });
});

describe("fechaEnZona / horaEnZona", () => {
  it("convierten un instante UTC a la hora de pared local", () => {
    const iso = "2026-06-18T15:30:00.000Z";
    expect(fechaEnZona(iso, MTY)).toBe("2026-06-18");
    expect(horaEnZona(iso, MTY)).toBe("09:30");
  });

  it("un instante de madrugada UTC cae el día anterior en Monterrey", () => {
    const iso = "2026-06-19T02:00:00.000Z"; // 20:00 del día 18 en MTY
    expect(fechaEnZona(iso, MTY)).toBe("2026-06-18");
    expect(horaEnZona(iso, MTY)).toBe("20:00");
  });
});

describe("ida y vuelta", () => {
  it("muro -> UTC -> muro conserva fecha y hora", () => {
    for (const [f, h] of [
      ["2026-03-01", "00:15"],
      ["2026-07-04", "23:45"],
      ["2026-12-31", "12:00"],
    ]) {
      const iso = muroAUtcISO(f, h, MTY);
      expect(fechaEnZona(iso, MTY)).toBe(f);
      expect(horaEnZona(iso, MTY)).toBe(h);
    }
  });
});

describe("inicioDiaUtcISO", () => {
  it("ancla un evento de todo el día a la medianoche local", () => {
    const iso = inicioDiaUtcISO("2026-06-18", MTY);
    expect(fechaEnZona(iso, MTY)).toBe("2026-06-18");
    expect(horaEnZona(iso, MTY)).toBe("00:00");
  });
});
