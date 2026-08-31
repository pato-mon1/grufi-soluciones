import {
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  ListChecks,
  Settings,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** El módulo llega en la Fase 2 (ruta con estado "en construcción"). */
  fase2?: boolean;
  /** Solo visible para administradores (se aplicará con `profiles` en Fase 2). */
  soloAdmin?: boolean;
}

/** Navegación del área interna, en el orden aprobado. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/seguimientos", label: "Seguimientos", icon: CalendarClock },
  { href: "/tareas", label: "Tareas", icon: ListChecks, fase2: true },
  { href: "/calendario", label: "Calendario", icon: CalendarDays, fase2: true },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/finanzas", label: "Finanzas", icon: Wallet, fase2: true },
  { href: "/contactos", label: "Contactos", icon: Users },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: Settings,
    fase2: true,
    soloAdmin: true,
  },
];

/** Ruta a la que se entra tras iniciar sesión. */
export const RUTA_INICIO = "/empresas";
