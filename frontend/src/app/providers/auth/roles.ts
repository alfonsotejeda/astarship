export type Role = "guide" | "manager" | "tourist" | "admin";

export interface PackageAuthorization {
  packageId: number;
  canGenerate: boolean;
  canValidate: boolean;
}

export interface User {
  name: string;
  role: Role;
  authorizations?: PackageAuthorization[];
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
