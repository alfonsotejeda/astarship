import type { Role } from "@/app/providers/auth/roles";
import { ApiError } from "@/lib/api/client";
import type { Authorization, GroupForm, GroupTourist, TravelGroup } from "@/lib/api/people";
import { enrollments, memberships, travelGroups } from "../data/groups";
import type { TravelGroupRecord } from "../data/groups";
import { findPackage } from "../data/packages";
import { authorizations, findUser, users } from "../data/users";
import type { UserRecord } from "../data/users";
import type { MockRoute } from "../types";

// Mock roles use the frontend names; the backend calls the manager operations_manager
const BACKEND_ROLE: Record<Role, string> = {
  guide: "guide",
  manager: "operations_manager",
  tourist: "tourist",
  admin: "admin",
};

interface UserBody {
  role?: string;
  name?: string;
  email?: string;
  password?: string;
  specialty?: string;
  age?: number;
  tourist?: { age?: number };
}

function requireAdmin(userId: number) {
  if (findUser(userId)?.role !== "admin") throw new ApiError(403, "Solo el administrador gestiona personas.");
}

function emailOf(user: UserRecord) {
  const first = user.name.split(" ")[0].normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  return user.email ?? `${first}@astarship.test`;
}

function toUser(user: UserRecord) {
  return {
    id: user.id,
    name: user.name,
    email: emailOf(user),
    role: BACKEND_ROLE[user.role],
    guide: user.role === "guide" ? { specialty: user.specialty ?? "" } : null,
    tourist: user.role === "tourist" ? { age: user.age ?? 0, travel_groups: [] } : null,
  };
}

function listUsers(role: string | null) {
  return users.filter(user => !role || BACKEND_ROLE[user.role] === role).map(toUser);
}

function checkEmail(email: string | undefined, exceptId?: number) {
  const value = email?.trim().toLowerCase();
  if (!value) throw new ApiError(422, "El email es obligatorio.");
  if (users.some(user => user.id !== exceptId && emailOf(user) === value)) {
    throw new ApiError(409, "Email already registered");
  }
  return value;
}

// Only guides and tourists are created here: the other roles are not managed from PersonasPage
function createUser(body: UserBody, userId: number) {
  requireAdmin(userId);
  if (body.role !== "guide" && body.role !== "tourist") throw new ApiError(422, "Rol no admitido.");
  if (!body.name?.trim() || !body.password) throw new ApiError(422, "Faltan el nombre o la contraseña.");

  const record: UserRecord = {
    id: Math.max(...users.map(user => user.id)) + 1,
    name: body.name.trim(),
    email: checkEmail(body.email),
    role: body.role,
    ...(body.role === "guide" ? { specialty: body.specialty?.trim() ?? "" } : { age: body.age ?? 0 }),
  };
  users.push(record);
  return toUser(record);
}

function updateUser(id: string, body: UserBody, userId: number) {
  requireAdmin(userId);
  const record = findUser(Number(id));
  if (!record) throw new ApiError(404, "User not found");

  if (body.name !== undefined) record.name = body.name.trim();
  if (body.email !== undefined) record.email = checkEmail(body.email, record.id);
  if (body.tourist?.age !== undefined && record.role === "tourist") record.age = body.tourist.age;
  return toUser(record);
}

function packageAuthorizations(packageId: string): Authorization[] {
  if (!findPackage(Number(packageId))) throw new ApiError(404, "Package not found");
  return authorizations.filter(item => item.package_id === Number(packageId));
}

function putAuthorization(params: Record<string, string>, body: Partial<Authorization>, userId: number) {
  requireAdmin(userId);
  const packageId = Number(params.packageId);
  const guideId = Number(params.guideId);
  if (!findPackage(packageId)) throw new ApiError(404, "Package not found");
  if (findUser(guideId)?.role !== "guide") throw new ApiError(404, "Guide not found");

  const values = { can_generate: body.can_generate ?? false, can_validate: body.can_validate ?? false };
  const existing = authorizations.find(item => item.guide_id === guideId && item.package_id === packageId);
  if (existing) return Object.assign(existing, values);

  const created = { guide_id: guideId, package_id: packageId, ...values };
  authorizations.push(created);
  return created;
}

function deleteAuthorization(params: Record<string, string>, userId: number) {
  requireAdmin(userId);
  const index = authorizations.findIndex(
    item => item.guide_id === Number(params.guideId) && item.package_id === Number(params.packageId),
  );
  if (index < 0) throw new ApiError(404, "Authorization not found");
  authorizations.splice(index, 1);
  return undefined;
}

function toTravelGroup(record: TravelGroupRecord): TravelGroup {
  return {
    ...record,
    guide_name: findUser(record.guide_id)?.name ?? "",
    package_name: findPackage(record.package_id)?.name ?? "",
    tourist_count: memberships.filter(item => item.travel_group_id === record.id).length,
  };
}

function findGroup(id: string | number) {
  const group = travelGroups.find(item => item.id === Number(id));
  if (!group) throw new ApiError(404, "Travel group not found");
  return group;
}

function createGroup(body: Partial<GroupForm>, userId: number) {
  requireAdmin(userId);
  if (!body.name?.trim()) throw new ApiError(422, "El grupo necesita un nombre.");
  if (findUser(Number(body.guide_id))?.role !== "guide") throw new ApiError(404, "Guide not found");
  if (!findPackage(Number(body.package_id))) throw new ApiError(404, "Package not found");
  if (!body.start_date || !body.end_date || body.end_date < body.start_date) {
    throw new ApiError(422, "Las fechas del viaje no son válidas.");
  }

  const record: TravelGroupRecord = {
    id: Math.max(0, ...travelGroups.map(group => group.id)) + 1,
    name: body.name.trim(),
    guide_id: Number(body.guide_id),
    package_id: Number(body.package_id),
    start_date: body.start_date,
    end_date: body.end_date,
  };
  travelGroups.push(record);
  return toTravelGroup(record);
}

function groupTourists(groupId: string): GroupTourist[] {
  const group = findGroup(groupId);

  return memberships
    .filter(item => item.travel_group_id === group.id)
    .map(item => {
      const tourist = findUser(item.tourist_id);
      const enrolled = enrollments.filter(enrollment => enrollment.tourist_id === item.tourist_id);
      return {
        id: item.tourist_id,
        name: tourist?.name ?? "",
        email: tourist ? emailOf(tourist) : "",
        age: tourist?.age ?? 0,
        packages: enrolled.map(enrollment => ({
          id: enrollment.package_id,
          name: findPackage(enrollment.package_id)?.name ?? "",
        })),
        itinerary_id: enrolled.find(enrollment => enrollment.package_id === group.package_id)?.itinerary_id ?? null,
      };
    });
}

// A tourist belongs to a single group (#193)
function addMember(params: Record<string, string>, userId: number) {
  requireAdmin(userId);
  const group = findGroup(params.id);
  const touristId = Number(params.touristId);
  if (findUser(touristId)?.role !== "tourist") throw new ApiError(404, "Tourist not found");
  if (memberships.some(item => item.tourist_id === touristId)) {
    throw new ApiError(409, "El turista ya pertenece a un grupo.");
  }

  const membership = { tourist_id: touristId, travel_group_id: group.id };
  memberships.push(membership);
  return membership;
}

function removeMember(params: Record<string, string>, userId: number) {
  requireAdmin(userId);
  const index = memberships.findIndex(
    item => item.travel_group_id === Number(params.id) && item.tourist_id === Number(params.touristId),
  );
  if (index < 0) throw new ApiError(404, "Membership not found");
  memberships.splice(index, 1);
  return undefined;
}

function addBooking(packageId: string, body: { tourist_id?: number }, userId: number) {
  requireAdmin(userId);
  const record = findPackage(Number(packageId));
  const touristId = Number(body.tourist_id);
  if (!record) throw new ApiError(404, "Package not found");
  if (findUser(touristId)?.role !== "tourist") throw new ApiError(404, "Tourist not found");
  // RN-09
  if (record.status !== "approved") throw new ApiError(409, `«${record.name}» no está validado y no admite inscripciones.`);
  if (enrollments.some(item => item.tourist_id === touristId && item.package_id === record.id)) {
    throw new ApiError(409, "El turista ya está inscrito en ese paquete.");
  }

  enrollments.push({ tourist_id: touristId, package_id: record.id, itinerary_id: null });
  record.enrolled += 1;
  return { tourist_id: touristId, package_id: record.id };
}

function removeBooking(params: Record<string, string>, userId: number) {
  requireAdmin(userId);
  const record = findPackage(Number(params.id));
  const index = enrollments.findIndex(
    item => item.package_id === Number(params.id) && item.tourist_id === Number(params.touristId),
  );
  if (!record || index < 0) throw new ApiError(404, "Booking not found");
  if (enrollments[index].itinerary_id !== null) {
    throw new ApiError(409, `Tiene un itinerario asignado en «${record.name}»: quita antes la asignación.`);
  }

  enrollments.splice(index, 1);
  record.enrolled -= 1;
  return undefined;
}

export const peopleRoutes: MockRoute[] = [
  { method: "GET", path: "/users", handler: ({ query }) => listUsers(query.get("role")) },
  { method: "POST", path: "/users", handler: ({ body, userId }) => createUser(body as UserBody, userId) },
  {
    method: "PATCH",
    path: "/users/:id",
    handler: ({ params, body, userId }) => updateUser(params.id, body as UserBody, userId),
  },
  { method: "GET", path: "/authorizations/packages/:id", handler: ({ params }) => packageAuthorizations(params.id) },
  {
    method: "PUT",
    path: "/authorizations/packages/:packageId/guides/:guideId",
    handler: ({ params, body, userId }) => putAuthorization(params, body as Partial<Authorization>, userId),
  },
  {
    method: "DELETE",
    path: "/authorizations/packages/:packageId/guides/:guideId",
    handler: ({ params, userId }) => deleteAuthorization(params, userId),
  },
  {
    method: "GET",
    path: "/travel-groups",
    handler: ({ userId }) => {
      requireAdmin(userId);
      return travelGroups.map(toTravelGroup);
    },
  },
  {
    method: "POST",
    path: "/travel-groups",
    handler: ({ body, userId }) => createGroup(body as Partial<GroupForm>, userId),
  },
  {
    method: "GET",
    path: "/travel-groups/:id/tourists",
    handler: ({ params, userId }) => {
      requireAdmin(userId);
      return groupTourists(params.id);
    },
  },
  { method: "POST", path: "/travel-groups/:id/tourists/:touristId", handler: ({ params, userId }) => addMember(params, userId) },
  {
    method: "DELETE",
    path: "/travel-groups/:id/tourists/:touristId",
    handler: ({ params, userId }) => removeMember(params, userId),
  },
  {
    method: "POST",
    path: "/packages/:id/bookings",
    handler: ({ params, body, userId }) => addBooking(params.id, body as { tourist_id?: number }, userId),
  },
  {
    method: "DELETE",
    path: "/packages/:id/bookings/:touristId",
    handler: ({ params, userId }) => removeBooking(params, userId),
  },
];
