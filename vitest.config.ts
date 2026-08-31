import { resolve } from "node:path";
import { defineConfig } from "vitest/config";

// Pruebas de lógica pura (sin DOM). Solo se ejecutan los archivos de prueba
// dentro de "lib" (ver "include"); el alias "@/" refleja el de tsconfig.
export default defineConfig({
  resolve: {
    alias: {
      "@": resolve(process.cwd(), "."),
    },
  },
  test: {
    include: ["lib/**/*.test.ts"],
    environment: "node",
  },
});
