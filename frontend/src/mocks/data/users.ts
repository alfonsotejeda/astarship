import type { Role } from "@/app/providers/auth/roles";

export interface UserRecord {
  id: number;
  name: string;
  role: Role;
  phone?: string;
  specialty?: string;
}

export interface AuthorizationRecord {
  guide_id: number;
  package_id: number;
  can_generate: boolean;
  can_validate: boolean;
}

// The demo logins of LoginPage use these ids
export const users: UserRecord[] = [
  { id: 1, name: "Laura Pérez", role: "guide", phone: "+53 5 284 1937", specialty: "Patrimonio colonial" },
  { id: 2, name: "Ernesto Díaz", role: "guide", phone: "+53 5 391 0482", specialty: "Naturaleza y senderismo" },
  { id: 3, name: "Yanet Rodríguez", role: "guide", phone: "+53 5 207 6615", specialty: "Gastronomía y artesanía" },
  { id: 4, name: "Rosa Fernández", role: "admin" },
  { id: 5, name: "Marta Rivas", role: "manager" },
  { id: 6, name: "Daniel Ortega", role: "tourist" },
];

export const authorizations: AuthorizationRecord[] = [
  { guide_id: 1, package_id: 1, can_generate: true, can_validate: false },
  { guide_id: 1, package_id: 2, can_generate: false, can_validate: true },
  { guide_id: 1, package_id: 3, can_generate: false, can_validate: true },
  { guide_id: 2, package_id: 1, can_generate: true, can_validate: false },
  { guide_id: 2, package_id: 2, can_generate: true, can_validate: false },
  { guide_id: 2, package_id: 3, can_generate: true, can_validate: true },
  { guide_id: 3, package_id: 1, can_generate: true, can_validate: true },
  { guide_id: 3, package_id: 3, can_generate: true, can_validate: false },
];

export function findUser(id: number) {
  return users.find(user => user.id === id);
}
