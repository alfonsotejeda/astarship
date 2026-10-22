import type { Role } from "@/app/providers/auth/roles";
import type { IconName } from "@/components/Icon/icons";

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  to: string;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  guide: [
    { key: "activities", label: "Banco de actividades", icon: "layers", to: "/actividades" },
    { key: "generate", label: "Generar itinerario", icon: "sparkles", to: "/itinerarios/nuevo" },
    { key: "itineraries", label: "Itinerarios", icon: "route", to: "/itinerarios" },
    { key: "packages", label: "Paquetes", icon: "package", to: "/paquetes" },
    { key: "requests", label: "Solicitudes", icon: "message", to: "/solicitudes" },
    { key: "ratings", label: "Valoraciones", icon: "star", to: "/valoraciones" },
    { key: "reports", label: "Reportes", icon: "chart", to: "/reportes/rc1" },
  ],
  manager: [
    { key: "itineraries", label: "Itinerarios", icon: "route", to: "/itinerarios" },
    { key: "packages", label: "Paquetes", icon: "package", to: "/paquetes" },
    { key: "validations", label: "Mis validaciones", icon: "clock", to: "/reportes/rc3" },
    { key: "reports", label: "Reportes", icon: "chart", to: "/reportes/rc1" },
  ],
  tourist: [
    { key: "today", label: "Hoy", icon: "calendar", to: "/viaje/hoy" },
    { key: "itineraries", label: "Mis itinerarios", icon: "route", to: "/viaje/itinerarios" },
    { key: "ratings", label: "Valoraciones", icon: "star", to: "/valoraciones" },
    { key: "requests", label: "Solicitudes", icon: "message", to: "/solicitudes" },
  ],
  admin: [
    { key: "packages", label: "Paquetes", icon: "package", to: "/paquetes" },
    { key: "people", label: "Personas", icon: "users", to: "/personas" },
    { key: "assignments", label: "Asignaciones", icon: "route", to: "/asignaciones" },
    { key: "activities", label: "Banco de actividades", icon: "layers", to: "/actividades" },
    { key: "reports", label: "Reportes", icon: "chart", to: "/reportes/rc1" },
  ],
};
