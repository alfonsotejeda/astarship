import type { Role } from "@/app/providers/auth/roles";

export interface NavItem {
  label: string;
  to: string;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  guide: [
    { label: "Banco de actividades", to: "/actividades" },
    { label: "Generar itinerario", to: "/itinerarios/nuevo" },
    { label: "Itinerarios", to: "/itinerarios" },
    { label: "Paquetes", to: "/paquetes" },
    { label: "Solicitudes", to: "/solicitudes" },
    { label: "Valoraciones", to: "/valoraciones" },
    { label: "Reportes", to: "/reportes/rc1" },
  ],
  manager: [
    { label: "Itinerarios", to: "/itinerarios" },
    { label: "Paquetes", to: "/paquetes" },
    { label: "Mis validaciones", to: "/reportes/rc3" },
    { label: "Reportes", to: "/reportes/rc1" },
  ],
  tourist: [
    { label: "Hoy", to: "/viaje/hoy" },
    { label: "Mis itinerarios", to: "/viaje/itinerarios" },
    { label: "Valoraciones", to: "/valoraciones" },
    { label: "Solicitudes", to: "/solicitudes" },
  ],
  admin: [
    { label: "Paquetes", to: "/paquetes" },
    { label: "Personas", to: "/personas" },
    { label: "Asignaciones", to: "/asignaciones" },
    { label: "Banco de actividades", to: "/actividades" },
    { label: "Reportes", to: "/reportes/rc1" },
  ],
};
