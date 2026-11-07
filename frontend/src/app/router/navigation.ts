import type { Role } from "@/app/providers/auth/roles";
import type { IconName } from "@/components/Icon/icons";

export interface NavItem {
  key: string;
  label: string;
  icon: IconName;
  to: string;
  // Also active on the routes below this one; without it, only on `to`
  match?: string;
  // Left out of the mobile tab bar, which fits five
  desktopOnly?: boolean;
}

export const NAV_BY_ROLE: Record<Role, NavItem[]> = {
  guide: [
    { key: "activities", label: "Banco de actividades", icon: "layers", to: "/activities", match: "/activities" },
    { key: "attractions", label: "Atracciones", icon: "landmark", to: "/attractions", match: "/attractions" },
    { key: "generate", label: "Generar itinerario", icon: "sparkles", to: "/itineraries/new" },
    { key: "itineraries", label: "Itinerarios", icon: "route", to: "/itineraries", match: "/itineraries" },
    { key: "packages", label: "Paquetes", icon: "package", to: "/packages" },
    { key: "requests", label: "Solicitudes", icon: "message", to: "/requests" },
    { key: "ratings", label: "Valoraciones", icon: "star", to: "/ratings" },
    { key: "reports", label: "Reportes", icon: "chart", to: "/reports/rc1", match: "/reports" },
  ],
  manager: [
    { key: "itineraries", label: "Itinerarios", icon: "route", to: "/itineraries", match: "/itineraries" },
    { key: "packages", label: "Paquetes", icon: "package", to: "/packages" },
    { key: "validations", label: "Mis validaciones", icon: "clock", to: "/reports/rc3" },
    { key: "reports", label: "Reportes", icon: "chart", to: "/reports/rc1", match: "/reports" },
  ],
  tourist: [
    { key: "today", label: "Hoy", icon: "calendar", to: "/trip/today" },
    { key: "itineraries", label: "Mis itinerarios", icon: "route", to: "/trip/itineraries", match: "/trip/itineraries" },
    { key: "catalog", label: "Catálogo", icon: "compass", to: "/catalog", match: "/catalog" },
    { key: "attractions", label: "Atracciones", icon: "landmark", to: "/attractions", match: "/attractions" },
    { key: "ratings", label: "Valoraciones", icon: "star", to: "/ratings", desktopOnly: true },
    { key: "requests", label: "Solicitudes", icon: "message", to: "/requests" },
  ],
  admin: [
    { key: "packages", label: "Paquetes", icon: "package", to: "/packages" },
    { key: "people", label: "Personas", icon: "users", to: "/people/guides", match: "/people" },
    { key: "assignments", label: "Asignaciones", icon: "route", to: "/assignments", match: "/assignments" },
    { key: "activities", label: "Banco de actividades", icon: "layers", to: "/activities", match: "/activities" },
    { key: "attractions", label: "Atracciones", icon: "landmark", to: "/attractions", match: "/attractions" },
    { key: "reports", label: "Reportes", icon: "chart", to: "/reports/rc1", match: "/reports" },
  ],
};

// An exact match wins, so «Generar itinerario» and «Mis validaciones» are not shadowed by their section
export function activeNavKey(items: NavItem[], pathname: string) {
  const exact = items.find(item => item.to === pathname);
  if (exact) return exact.key;
  return items.find(item => item.match && (pathname === item.match || pathname.startsWith(`${item.match}/`)))?.key;
}
