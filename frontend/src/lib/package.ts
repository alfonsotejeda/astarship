import type { Status } from "@/components/StatusPill/StatusPill";
import type { Package, PackagePermission, ReviewStatus } from "@/lib/api/packages";
import { formatDate } from "@/lib/format";

export const PERMISSION_LABEL: Record<PackagePermission, string> = {
  generate_itinerary: "Genera itinerarios",
  validate_itinerary: "Valida itinerarios",
  edit_package: "Edita el paquete",
  validate_package: "Valida el paquete",
};

export const STATUS_PILL: Record<ReviewStatus, { status: Status; label: string }> = {
  approved: { status: "aprobado", label: "Validado" },
  pending: { status: "pendiente", label: "Sin validar" },
  rejected: { status: "rechazado", label: "Devuelto" },
};

// Returned first, then pending, so the manager sees what needs work at the top
export const STATUS_ORDER: Record<ReviewStatus, number> = { rejected: 0, pending: 1, approved: 2 };

export const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "approved", label: "Validados" },
  { value: "pending", label: "Sin validar" },
  { value: "rejected", label: "Devueltos" },
];

export function matchesSearch(pkg: Package, query: string) {
  const text = query.trim().toLowerCase();
  return !text || pkg.name.toLowerCase().includes(text) || pkg.destination.toLowerCase().includes(text);
}

export function permissionLabels(permissions: PackagePermission[]) {
  return permissions.map(permission => PERMISSION_LABEL[permission]);
}

export function validationText(pkg: Package) {
  const validation = pkg.last_validation;
  const created = `Creado por ${pkg.admin_name} el ${formatDate(pkg.creation_date)}.`;

  if (pkg.status === "approved" && validation) {
    return `Validado por ${validation.reviewer_name} el ${formatDate(validation.validation_date)}.`;
  }
  if (pkg.status === "rejected" && validation) {
    return `Devuelto por ${validation.reviewer_name} el ${formatDate(validation.validation_date)}: ${validation.observations}`;
  }
  // Pending again after a validation means its categories changed (RN-11)
  if (validation?.result === "approved") return `${created} Sus categorías cambiaron: pendiente de validar otra vez.`;
  return `${created} Pendiente de validar.`;
}

// What the manager checks before validating (pantallas.md P-29)
export function validationChecks(pkg: Package) {
  const canGenerate = pkg.people.some(person => person.permissions.includes("generate_itinerary"));

  return [
    { ok: pkg.destination.trim() !== "", text: "Tiene destino" },
    { ok: pkg.categories.length >= 2, text: `Cubre al menos 2 categorías (${pkg.categories.length})` },
    { ok: canGenerate, text: "Hay al menos un guía que puede generar itinerarios" },
  ];
}
