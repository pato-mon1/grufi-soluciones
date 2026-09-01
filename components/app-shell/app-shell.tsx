"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Cloud,
  HardDrive,
  LogOut,
  Menu,
  PanelLeft,
  PanelLeftClose,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "@/lib/nav";
import { useEmpresas } from "@/lib/hooks/use-empresas";
import { useFase2 } from "@/lib/hooks/use-fase2";
import { usePermisos } from "@/lib/hooks/use-permisos";
import { moduloDeRuta } from "@/lib/permisos";
import { CampanaNotificaciones } from "@/components/app-shell/campana-notificaciones";
import { GuardModulo } from "@/components/app-shell/guard-modulo";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

function rutaActiva(pathname: string, href: string): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Lista de navegación reutilizada en la barra lateral y el drawer móvil. */
function NavLista({
  pathname,
  colapsado,
  esAdmin,
  visible,
  onNavegar,
}: {
  pathname: string;
  colapsado: boolean;
  esAdmin: boolean;
  visible: (href: string) => boolean;
  onNavegar?: () => void;
}) {
  const items = NAV_ITEMS.filter(
    (item) => (!item.soloAdmin || esAdmin) && visible(item.href),
  );
  return (
    <nav className="flex flex-1 flex-col gap-0.5 p-2" aria-label="Navegación">
      {items.map((item) => {
        const activa = rutaActiva(pathname, item.href);
        const Icono = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavegar}
            aria-current={activa ? "page" : undefined}
            title={colapsado ? item.label : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              colapsado && "justify-center px-0",
              activa
                ? "bg-accent text-foreground"
                : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
            )}
          >
            <span
              className={cn(
                "flex h-5 w-1 shrink-0 rounded-full",
                activa ? "bg-champagne" : "bg-transparent",
                colapsado && "hidden",
              )}
              aria-hidden
            />
            <Icono
              className={cn(
                "h-4 w-4 shrink-0",
                activa ? "text-champagne" : "text-muted-foreground",
              )}
            />
            {!colapsado && (
              <span className="flex-1 truncate">{item.label}</span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}

function Marca({ colapsado }: { colapsado?: boolean }) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 px-4 py-4",
        colapsado && "justify-center px-0",
      )}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[13px] font-bold text-primary-foreground">
        G
      </span>
      {!colapsado && (
        <span className="text-sm font-semibold tracking-tight text-foreground">
          GRUFI SOLUCIONES
        </span>
      )}
    </div>
  );
}

/** Indicador Local / Nube + usuario + cerrar sesión. */
function PiePanel({ colapsado }: { colapsado?: boolean }) {
  const { esSupabase, usuario, cerrarSesion } = useEmpresas();
  const [montado, setMontado] = useState(false);
  useEffect(() => setMontado(true), []);

  return (
    <div className="border-t p-2">
      {montado && (
        <div
          className={cn(
            "flex items-center gap-2 px-2 py-1.5 text-[11px] font-medium text-muted-foreground",
            colapsado && "justify-center px-0",
          )}
        >
          {esSupabase ? (
            <Cloud className="h-3.5 w-3.5 shrink-0 text-estado-avance" />
          ) : (
            <HardDrive className="h-3.5 w-3.5 shrink-0" />
          )}
          {!colapsado && <span>{esSupabase ? "Nube" : "Local"}</span>}
        </div>
      )}
      {montado && esSupabase && usuario && !colapsado && (
        <p className="truncate px-2 pb-1 text-[11px] text-muted-foreground">
          {usuario}
        </p>
      )}
      <button
        type="button"
        onClick={() => void cerrarSesion()}
        title="Cerrar sesión"
        className={cn(
          "flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground",
          colapsado && "justify-center px-0",
        )}
      >
        <LogOut className="h-4 w-4 shrink-0" />
        {!colapsado && "Cerrar sesión"}
      </button>
    </div>
  );
}

/** Layout interno: barra lateral fija/colapsable + drawer móvil + contenido. */
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { perfil } = useFase2();
  const { esAdmin: esAdminPerm, puede } = usePermisos();
  const esAdmin = esAdminPerm || !perfil || perfil.rol === "admin";
  const visible = (href: string) => {
    const m = moduloDeRuta(href);
    return !m || puede(m, "view");
  };
  const [colapsado, setColapsado] = useState(false);
  const [drawerAbierto, setDrawerAbierto] = useState(false);

  // Cierra el drawer al cambiar de ruta.
  useEffect(() => {
    setDrawerAbierto(false);
  }, [pathname]);

  return (
    <div className="flex min-h-screen bg-background">
      {/* Barra lateral (escritorio) */}
      <aside
        className={cn(
          "sticky top-0 hidden h-screen shrink-0 flex-col border-r bg-card lg:flex",
          colapsado ? "w-16" : "w-60",
        )}
      >
        <Marca colapsado={colapsado} />
        <div className="px-2">
          <button
            type="button"
            onClick={() => setColapsado((v) => !v)}
            title={colapsado ? "Expandir menú" : "Colapsar menú"}
            aria-label={colapsado ? "Expandir menú" : "Colapsar menú"}
            className="flex w-full items-center justify-center rounded-md py-1.5 text-muted-foreground transition-colors hover:bg-accent/60 hover:text-foreground"
          >
            {colapsado ? (
              <PanelLeft className="h-4 w-4" />
            ) : (
              <PanelLeftClose className="h-4 w-4" />
            )}
          </button>
        </div>
        <NavLista pathname={pathname} colapsado={colapsado} esAdmin={esAdmin} visible={visible} />
        <PiePanel colapsado={colapsado} />
      </aside>

      {/* Drawer (móvil) */}
      <Sheet open={drawerAbierto} onOpenChange={setDrawerAbierto}>
        <SheetContent side="left" className="w-64 gap-0 p-0">
          <SheetHeader className="border-b p-0">
            <SheetTitle className="sr-only">Menú</SheetTitle>
            <Marca />
          </SheetHeader>
          <NavLista
            pathname={pathname}
            colapsado={false}
            esAdmin={esAdmin}
            visible={visible}
            onNavegar={() => setDrawerAbierto(false)}
          />
          <PiePanel />
        </SheetContent>
      </Sheet>

      {/* Contenido */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Barra superior (móvil) */}
        <header className="sticky top-0 z-20 flex items-center gap-3 border-b bg-card px-4 py-3 lg:hidden">
          <button
            type="button"
            onClick={() => setDrawerAbierto(true)}
            aria-label="Abrir menú"
            className="rounded-md p-1 text-muted-foreground hover:bg-accent/60 hover:text-foreground"
          >
            <Menu className="h-5 w-5" />
          </button>
          <span className="text-sm font-semibold tracking-tight text-foreground">
            GRUFI SOLUCIONES
          </span>
          <div className="ml-auto">
            <CampanaNotificaciones />
          </div>
        </header>

        {/* Barra superior (escritorio): solo la campana */}
        <header className="sticky top-0 z-20 hidden items-center justify-end border-b bg-card px-6 py-2 lg:flex">
          <CampanaNotificaciones />
        </header>

        <main className="min-w-0 flex-1">
          <GuardModulo>{children}</GuardModulo>
        </main>
      </div>
    </div>
  );
}
