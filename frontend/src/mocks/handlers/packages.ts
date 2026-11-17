import { ApiError } from "@/lib/api/client";
import type { Package, PackageForm, PackagePermission, PackagePerson, PackageValidationRequest } from "@/lib/api/packages";
import { categories } from "../data/catalogs";
import { itineraries } from "../data/itineraries";
import { nextPackageId, packages, packageValidations } from "../data/packages";
import type { PackageRecord } from "../data/packages";
import { authorizations, findUser, users } from "../data/users";
import type { MockRoute } from "../types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function role(userId: number) {
  return findUser(userId)?.role;
}

// MERX v1.8: the manager validates every package; guides hold itinerary permissions per package
function permissionsOf(userId: number, packageId: number): PackagePermission[] {
  if (role(userId) === "manager") return ["validate_itinerary", "validate_package"];

  const authorization = authorizations.find(item => item.guide_id === userId && item.package_id === packageId);
  const permissions: PackagePermission[] = [];
  if (authorization?.can_generate) permissions.push("generate_itinerary");
  if (authorization?.can_validate) permissions.push("validate_itinerary");
  return permissions;
}

function people(packageId: number): PackagePerson[] {
  return users
    .filter(user => user.role === "guide" || user.role === "manager")
    .map(user => ({ user_id: user.id, name: user.name, permissions: permissionsOf(user.id, packageId) }))
    .filter(person => person.permissions.length > 0);
}

function lastValidation(packageId: number) {
  const last = packageValidations
    .filter(item => item.package_id === packageId)
    .sort((a, b) => b.validation_date.localeCompare(a.validation_date))[0];
  if (!last) return null;

  return {
    reviewer_id: last.reviewer_id,
    reviewer_name: findUser(last.reviewer_id)?.name ?? "",
    validation_date: last.validation_date,
    result: last.result,
    observations: last.observations,
  };
}

// RNF-10: the admin and the manager see every package; a guide, those where they hold a permission
function isVisible(record: PackageRecord, userId: number) {
  const userRole = role(userId);
  if (userRole === "admin" || userRole === "manager") return true;
  return userRole === "guide" && permissionsOf(userId, record.id).length > 0;
}

export function toPackage({ category_ids, ...record }: PackageRecord, userId: number): Package {
  const packageItineraries = itineraries.filter(item => item.package_id === record.id);
  const userRole = role(userId);

  return {
    ...record,
    admin_name: findUser(record.admin_id)?.name ?? "",
    categories: categories.filter(category => category_ids.includes(category.id)),
    approved_itineraries: packageItineraries.filter(item => item.status === "approved").length,
    total_itineraries: packageItineraries.length,
    people: people(record.id),
    my_permissions: userRole === "admin" ? [] : permissionsOf(userId, record.id),
    can_edit: userRole === "admin",
    can_validate: userRole === "manager" && record.status === "pending",
    last_validation: lastValidation(record.id),
  };
}

// Generating needs the permission and a validated package (RN-02, RN-09)
function generablePackageIds(userId: number) {
  const allowed = authorizations
    .filter(item => item.guide_id === userId && item.can_generate)
    .map(item => item.package_id);
  return packages.filter(item => item.status === "approved" && allowed.includes(item.id)).map(item => item.id);
}

function findVisible(id: string, userId: number) {
  const record = packages.find(item => item.id === Number(id));
  if (!record || !isVisible(record, userId)) throw new ApiError(404, "El paquete no existe o no puedes verlo.");
  return record;
}

// Only the admin creates and edits packages (MERX v1.8)
function requireAdmin(userId: number) {
  if (role(userId) !== "admin") throw new ApiError(403, "Solo el administrador crea y edita paquetes.");
}

function checkFields({ name, destination }: Partial<PackageForm>) {
  if (!name?.trim() || !destination?.trim()) throw new ApiError(422, "El paquete necesita nombre y destino.");
}

function create(body: Partial<PackageForm>, userId: number) {
  requireAdmin(userId);
  checkFields(body);

  // Born pending: it needs a validation before admitting itineraries (RN-09)
  const record: PackageRecord = {
    id: nextPackageId.value++,
    name: body.name!.trim(),
    destination: body.destination!.trim(),
    status: "pending",
    creation_date: today(),
    admin_id: userId,
    category_ids: [],
    enrolled: 0,
  };
  packages.push(record);
  return toPackage(record, userId);
}

function update(id: string, body: Partial<PackageForm>, userId: number) {
  requireAdmin(userId);
  checkFields(body);

  const record = findVisible(id, userId);
  record.name = body.name!.trim();
  record.destination = body.destination!.trim();
  return toPackage(record, userId);
}

function setCategories(id: string, body: Partial<PackageForm>, userId: number) {
  requireAdmin(userId);

  const record = findVisible(id, userId);
  const next = [...(body.category_ids ?? [])].sort();
  const changed = next.join() !== [...record.category_ids].sort().join();
  record.category_ids = body.category_ids ?? [];
  // RN-11
  if (changed && record.status === "approved") record.status = "pending";
  return toPackage(record, userId);
}

function validate(id: string, body: PackageValidationRequest, userId: number) {
  const record = findVisible(id, userId);
  if (role(userId) !== "manager") throw new ApiError(403, "No puedes validar este paquete.");
  if (record.status !== "pending") throw new ApiError(409, "El paquete no está pendiente de validar.");
  if (body.result === "rejected" && !body.observations.trim()) {
    throw new ApiError(422, "Para devolver el paquete hay que escribir observaciones.");
  }

  record.status = body.result;
  packageValidations.push({
    package_id: record.id,
    reviewer_id: userId,
    validation_date: today(),
    result: body.result,
    observations: body.observations.trim() || null,
  });
  return toPackage(record, userId);
}

export const packageRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/packages",
    handler: ({ query, userId }) => {
      const ids = query.get("permission") === "generate_itinerary" ? generablePackageIds(userId) : null;
      return packages
        .filter(item => (ids ? ids.includes(item.id) : isVisible(item, userId)))
        .map(item => toPackage(item, userId));
    },
  },
  { method: "POST", path: "/packages", handler: ({ body, userId }) => create(body as Partial<PackageForm>, userId) },
  {
    method: "PATCH",
    path: "/packages/:id",
    handler: ({ params, body, userId }) => update(params.id, body as Partial<PackageForm>, userId),
  },
  {
    method: "PUT",
    path: "/packages/:id/categories",
    handler: ({ params, body, userId }) => setCategories(params.id, body as Partial<PackageForm>, userId),
  },
  {
    method: "POST",
    path: "/packages/:id/validations",
    handler: ({ params, body, userId }) => validate(params.id, body as PackageValidationRequest, userId),
  },
];
