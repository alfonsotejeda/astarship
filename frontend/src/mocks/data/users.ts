export interface UserRecord {
  id: number;
  name: string;
}

export interface AuthorizationRecord {
  guide_id: number;
  package_id: number;
  can_generate: boolean;
  can_validate: boolean;
}

// The session the mocks answer for: Laura Pérez, the demo guide
export const CURRENT_USER_ID = 1;

export const users: UserRecord[] = [
  { id: 1, name: "Laura Pérez" },
  { id: 2, name: "Ernesto Díaz" },
  { id: 3, name: "Yanet Rodríguez" },
];

export const authorizations: AuthorizationRecord[] = [
  { guide_id: 1, package_id: 1, can_generate: true, can_validate: false },
  { guide_id: 1, package_id: 2, can_generate: false, can_validate: true },
  { guide_id: 2, package_id: 2, can_generate: true, can_validate: false },
];
