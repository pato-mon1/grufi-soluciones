import { STORAGE_KEY_MODO } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { localStorageRepository } from "@/lib/repository/local-storage-repository";
import { supabaseRepository } from "@/lib/repository/supabase-repository";
import type { EmpresaRepository } from "@/lib/repository/types";

/** El usuario eligió "Continuar en modo local" pese a tener Supabase configurado. */
export function prefiereModoLocal(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(STORAGE_KEY_MODO) === "local";
}

export function fijarPreferenciaModo(modo: "local" | "nube" | null): void {
  if (typeof window === "undefined") return;
  if (modo === null) window.localStorage.removeItem(STORAGE_KEY_MODO);
  else window.localStorage.setItem(STORAGE_KEY_MODO, modo);
}

/** `true` si la app debe usar Supabase (configurado y sin preferir modo local). */
export function usandoSupabase(): boolean {
  return isSupabaseConfigured() && !prefiereModoLocal();
}

/**
 * Devuelve la implementación de repositorio adecuada:
 * - Supabase, si hay credenciales y el usuario no eligió modo local.
 * - localStorage (respaldo), en cualquier otro caso.
 */
export function getRepository(): EmpresaRepository {
  return usandoSupabase() ? supabaseRepository : localStorageRepository;
}

export { localStorageRepository, supabaseRepository };
export type { EmpresaRepository };
