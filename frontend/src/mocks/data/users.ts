import type { Role } from "@/app/providers/auth/roles";

export interface UserRecord {
  id: number;
  name: string;
  role: Role;
  phone?: string;
  specialty?: string;
  age?: number;
  // Users made from PersonasPage; the rest get one derived from their name
  email?: string;
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
  { id: 6, name: "Daniel Ortega", role: "tourist", age: 36 },
  { id: 7, name: "Ana Gómez", role: "tourist", age: 34 },
  { id: 8, name: "Carlos Ruiz", role: "tourist", age: 41 },
  { id: 9, name: "Jorge Peña", role: "tourist", age: 29 },
  { id: 10, name: "María José Sanz", role: "tourist", age: 67 },
  { id: 11, name: "Iván Torres", role: "tourist", age: 52 },
  { id: 12, name: "Elena Vidal", role: "tourist", age: 38 },
  { id: 13, name: "Lucía Fernández", role: "tourist", age: 45 },
  { id: 14, name: "Sofía Martín", role: "tourist", age: 31 },
  { id: 15, name: "Pedro Alonso", role: "tourist", age: 58 },
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
