export type Role = "guide" | "manager" | "tourist" | "admin";

export interface User {
  name: string;
  role: Role;
}

export const ROLE_LABEL: Record<Role, string> = {
  guide: "Guía turístico",
  manager: "Jefe de operaciones",
  tourist: "Turista",
  admin: "Administrador",
};

export const HOME_BY_ROLE: Record<Role, string> = {
  guide: "/actividades",
  manager: "/itinerarios",
  tourist: "/viaje/hoy",
  admin: "/paquetes",
};
