import type { Authorization, GroupTourist } from "@/lib/api/people";

export type Permissions = Pick<Authorization, "can_generate" | "can_validate">;

// Changes not saved yet, by authorizationKey
export type PermissionDraft = Record<string, Permissions>;

const NONE: Permissions = { can_generate: false, can_validate: false };

export function authorizationKey(guideId: number, packageId: number) {
  return `${guideId}:${packageId}`;
}

export function savedPermissions(authorizations: Authorization[], guideId: number, packageId: number): Permissions {
  const found = authorizations.find(item => item.guide_id === guideId && item.package_id === packageId);
  return found ? { can_generate: found.can_generate, can_validate: found.can_validate } : NONE;
}

// Drafted cells that differ from what is saved; a cell toggled back is not a change
export function pendingChanges(authorizations: Authorization[], draft: PermissionDraft): Authorization[] {
  return Object.entries(draft).flatMap(([key, permissions]) => {
    const [guideId, packageId] = key.split(":").map(Number);
    const saved = savedPermissions(authorizations, guideId, packageId);
    const changed =
      saved.can_generate !== permissions.can_generate || saved.can_validate !== permissions.can_validate;
    return changed ? [{ guide_id: guideId, package_id: packageId, ...permissions }] : [];
  });
}

// Each checkbox counts on its own: a cell with both toggled is two permissions
export function changedBoxes(authorizations: Authorization[], changes: Authorization[]) {
  return changes.reduce((count, change) => {
    const saved = savedPermissions(authorizations, change.guide_id, change.package_id);
    return count + Number(saved.can_generate !== change.can_generate) + Number(saved.can_validate !== change.can_validate);
  }, 0);
}

export function changesText(count: number) {
  return count === 1 ? "1 permiso cambiado" : `${count} permisos cambiados`;
}

export function emailError(email: string) {
  if (!email.trim()) return "Escribe el email.";
  if (!/^\S+@\S+\.\S+$/.test(email.trim())) return "Escribe un email válido, como nombre@dominio.com.";
  return undefined;
}

export function passwordError(password: string) {
  if (!password) return "Escribe una contraseña.";
  if (password.length < 8) return "Al menos 8 caracteres.";
  return undefined;
}

export function matchesTourist(tourist: GroupTourist, query: string, packageId: string) {
  const text = query.trim().toLowerCase();
  return (
    (!text || tourist.name.toLowerCase().includes(text)) &&
    (!packageId || tourist.packages.some(pkg => String(pkg.id) === packageId))
  );
}
