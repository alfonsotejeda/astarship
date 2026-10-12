import type { Role } from "@/app/providers/auth/roles";
import type { IconName } from "@/components/Icon/icons";

export interface NavItem {
  label: string;
  icon: IconName;
  to: string;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  guide: [
    { label: "Banco de actividades", icon: "layers", to: "/actividades" },
    { label: "Generar itinerario", icon: "sparkles", to: "/itinerarios/nuevo" },
    { label: "Itinerarios", icon: "route", to: "/itinerarios" },
    { label: "Paquetes", icon: "package", to: "/paquetes" },
    { label: "Solicitudes", icon: "message", to: "/solicitudes" },
    { label: "Valoraciones", icon: "star", to: "/valoraciones" },
    { label: "Reportes", icon: "chart", to: "/reportes/rc1" },
  ],
  manager: [
    { label: "Itinerarios", icon: "route", to: "/itinerarios" },
    { label: "Paquetes", icon: "package", to: "/paquetes" },
    { label: "Mis validaciones", icon: "clock", to: "/reportes/rc3" },
    { label: "Reportes", icon: "chart", to: "/reportes/rc1" },
  ],
  tourist: [
    { label: "Hoy", icon: "calendar", to: "/viaje/hoy" },
    { label: "Mis itinerarios", icon: "route", to: "/viaje/itinerarios" },
    { label: "Valoraciones", icon: "star", to: "/valoraciones" },
    { label: "Solicitudes", icon: "message", to: "/solicitudes" },
  ],
  admin: [
    { label: "Paquetes", icon: "package", to: "/paquetes" },
    { label: "Personas", icon: "users", to: "/personas" },
    { label: "Asignaciones", icon: "route", to: "/asignaciones" },
    { label: "Banco de actividades", icon: "layers", to: "/actividades" },
    { label: "Reportes", icon: "chart", to: "/reportes/rc1" },
  ],
};
