import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import {
  SUPABASE_SERVICE_ROLE_KEY,
  SUPABASE_URL,
  tieneServiceRole,
} from "@/lib/supabase/config";

/**
 * Cliente de Supabase con `service_role` — SOLO para Route Handlers del
 * servidor. Salta las políticas RLS, así que se usa únicamente después de
 * comprobar en el handler que quien llama es administrador de su organización.
 *
 * `import "server-only"` hace que el build falle si este archivo se importa
 * desde código de cliente por accidente.
 */
export function createSupabaseAdminClient(): SupabaseClient {
  if (!tieneServiceRole()) {
    throw new Error("SERVICE_ROLE_NO_CONFIGURADO");
  }
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
