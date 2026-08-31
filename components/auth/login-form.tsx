"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/empresas/field";
import { RUTA_INICIO } from "@/lib/nav";
import { getSupabaseClient } from "@/lib/supabase/client";

/** Traduce los mensajes de error de Supabase Auth al español. */
function traducirError(mensaje: string): string {
  const m = mensaje.toLowerCase();
  if (m.includes("invalid login credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (m.includes("email not confirmed")) {
    return "Tu cuenta todavía no está confirmada. Contacta al administrador.";
  }
  if (m.includes("too many requests") || m.includes("rate limit")) {
    return "Demasiados intentos. Espera unos minutos e inténtalo de nuevo.";
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Error de conexión. Revisa tu internet e inténtalo de nuevo.";
  }
  return "No se pudo iniciar sesión. Inténtalo de nuevo.";
}

/** Pantalla de inicio de sesión (ruta `/login`). */
export function LoginForm() {
  const router = useRouter();
  const [correo, setCorreo] = useState("");
  const [contrasena, setContrasena] = useState("");
  const [verContrasena, setVerContrasena] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setError(null);

    const email = correo.trim();
    if (!email || !contrasena) {
      setError("Escribe tu correo y tu contraseña.");
      return;
    }

    setCargando(true);
    try {
      const { error: errorAuth } = await getSupabaseClient().auth
        .signInWithPassword({ email, password: contrasena });

      if (errorAuth) {
        setError(traducirError(errorAuth.message));
        return;
      }

      // Sesión iniciada: el middleware ya permitirá el acceso al área interna.
      router.replace(RUTA_INICIO);
      router.refresh();
    } catch {
      setError("No se pudo iniciar sesión. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-sm rounded-lg border bg-card p-6 shadow-card sm:p-8">
        <div className="mb-6 space-y-1.5 text-center">
          <span className="mx-auto flex h-11 w-11 items-center justify-center rounded-full bg-champagne/15">
            <Lock className="h-5 w-5 text-champagne" />
          </span>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">
            GRUFI SOLUCIONES
          </h1>
          <p className="text-sm text-muted-foreground">
            Acceso al sistema de seguimiento
          </p>
        </div>

        <form onSubmit={enviar} className="space-y-4" noValidate>
          <Field id="correo" label="Correo electrónico">
            <Input
              id="correo"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              disabled={cargando}
              required
              autoFocus
              aria-invalid={Boolean(error)}
            />
          </Field>

          <Field id="contrasena" label="Contraseña">
            <div className="relative">
              <Input
                id="contrasena"
                type={verContrasena ? "text" : "password"}
                autoComplete="current-password"
                value={contrasena}
                onChange={(e) => setContrasena(e.target.value)}
                disabled={cargando}
                required
                className="pr-10"
                aria-invalid={Boolean(error)}
              />
              <button
                type="button"
                onClick={() => setVerContrasena((v) => !v)}
                disabled={cargando}
                aria-label={
                  verContrasena ? "Ocultar contraseña" : "Mostrar contraseña"
                }
                className="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {verContrasena ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </Field>

          {error && (
            <p
              role="alert"
              className="rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm font-medium text-destructive"
            >
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" disabled={cargando}>
            {cargando && <Loader2 className="h-4 w-4 animate-spin" />}
            {cargando ? "Verificando…" : "Iniciar sesión"}
          </Button>
        </form>

        <p className="mt-5 text-center text-[11px] leading-relaxed text-muted-foreground">
          Acceso exclusivo para usuarios autorizados. Las cuentas se crean
          manualmente desde Supabase (Authentication → Users).
        </p>
      </div>
    </main>
  );
}
