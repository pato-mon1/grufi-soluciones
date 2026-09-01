import {
  BarChart3,
  Building2,
  CalendarClock,
  CalendarDays,
  ListChecks,
  Settings,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Solo visible para perfiles con rol de administrador. */
  soloAdmin?: boolean;
}

/** Navegación del área interna, en el orden aprobado. */
export const NAV_ITEMS: NavItem[] = [
  { href: "/empresas", label: "Empresas", icon: Building2 },
  { href: "/seguimientos", label: "Seguimientos", icon: CalendarClock },
  { href: "/tareas", label: "Tareas", icon: ListChecks },
  { href: "/calendario", label: "Calendario", icon: CalendarDays },
  { href: "/reportes", label: "Reportes", icon: BarChart3 },
  { href: "/finanzas", label: "Finanzas", icon: Wallet },
  { href: "/contactos", label: "Contactos", icon: Users },
  { href: "/asistente", label: "Asistente GRUFI", icon: Sparkles },
  {
    href: "/configuracion",
    label: "Configuración",
    icon: Settings,
    soloAdmin: true,
  },
];

/** Ruta a la que se entra tras iniciar sesión. */
export const RUTA_INICIO = "/empresas";
