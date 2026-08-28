"use client";

import { Toaster as SonnerToaster } from "sonner";

/** Notificaciones de la aplicación (confirmaciones y errores). */
export function Toaster() {
  return (
    <SonnerToaster
      theme="light"
      position="bottom-right"
      richColors
      closeButton
      toastOptions={{
        classNames: {
          toast:
            "group rounded-lg border border-border bg-card text-foreground shadow-card",
          description: "text-muted-foreground",
        },
      }}
    />
  );
}
