import { STORAGE_KEY_MODO } from "@/lib/constants";
import { isSupabaseConfigured } from "@/lib/supabase/client";
import { localStorageRepository } from "@/lib/repository/local-storage-repository";
import { supabaseRepository } from "@/lib/repository/supabase-repository";
import { fase2LocalRepository } from "@/lib/repository/fase2-local";
import { fase2SupabaseRepository } from "@/lib/repository/fase2-supabase";
import type { EmpresaRepository } from "@/lib/repository/types";
import type { Fase2Repository } from "@/lib/repository/fase2-types";

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

/** Repositorio de los módulos de la Fase 2 (mismo criterio de backend). */
export function getFase2Repository(): Fase2Repository {
  return usandoSupabase() ? fase2SupabaseRepository : fase2LocalRepository;
}

export {
  localStorageRepository,
  supabaseRepository,
  fase2LocalRepository,
  fase2SupabaseRepository,
};
export type { EmpresaRepository, Fase2Repository };
