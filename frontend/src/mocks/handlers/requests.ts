import { ApiError } from "@/lib/api/client";
import type {
  ModificationRequest,
  ModificationRequestCreate,
  ModificationRequestUpdate,
  SupportGuide,
} from "@/lib/api/requests";
import { findActivityRecord } from "../data/activities";
import { assignments, daysFromToday } from "../data/assignments";
import { memberships, travelGroups } from "../data/groups";
import { itineraries } from "../data/itineraries";
import { modificationRequests } from "../data/requests";
import type { ModificationRequestRecord } from "../data/requests";
import { authorizations, findUser } from "../data/users";
import type { MockRoute } from "../types";
import { packageOf, toDays } from "./itineraries";

const CLOSED = ["resolved", "denied"];

function itineraryOf(id: number) {
  const record = itineraries.find(item => item.id === id);
  if (!record) throw new ApiError(404, "El itinerario no existe.");
  return record;
}

function groupName(touristId: number, packageId: number) {
  const groupIds = memberships.filter(item => item.tourist_id === touristId).map(item => item.travel_group_id);
  return travelGroups.find(group => groupIds.includes(group.id) && group.package_id === packageId)?.name ?? null;
}

// RN-08: the assigned guide or the one asked as support can handle it
function handles(record: ModificationRequestRecord, userId: number) {
  return itineraryOf(record.itinerary_id).guide_id === userId || record.support_guide_id === userId;
}

function toRequest(record: ModificationRequestRecord, userId: number): ModificationRequest {
  const itinerary = itineraryOf(record.itinerary_id);
  const pkg = packageOf(itinerary);
  return {
    id: record.id,
    itinerary_id: record.itinerary_id,
    package_id: pkg.id,
    package_name: pkg.name,
    tourist_id: record.tourist_id,
    tourist_name: findUser(record.tourist_id)?.name ?? "",
    group_name: groupName(record.tourist_id, pkg.id),
    guide_name: findUser(itinerary.guide_id)?.name ?? "",
    support_guide_name: record.support_guide_id ? (findUser(record.support_guide_id)?.name ?? null) : null,
    is_support: record.support_guide_id === userId && itinerary.guide_id !== userId,
    request_date: record.request_date,
    description: record.description,
    activity_names: record.activity_ids.map(id => findActivityRecord(id)?.name ?? "").filter(Boolean),
    status: record.status,
    result: record.result,
    new_itinerary_id: record.new_itinerary_id,
  };
}

function newestFirst(a: ModificationRequestRecord, b: ModificationRequestRecord) {
  return b.request_date.localeCompare(a.request_date) || b.id - a.id;
}

// RNF-10: each role only gets its own requests
function list(userId: number) {
  const role = findUser(userId)?.role;
  if (role === "tourist") {
    return modificationRequests
      .filter(item => item.tourist_id === userId)
      .sort(newestFirst)
      .map(item => toRequest(item, userId));
  }
  if (role === "guide") {
    return modificationRequests
      .filter(item => handles(item, userId))
      .sort(newestFirst)
      .map(item => toRequest(item, userId));
  }
  throw new ApiError(403, "Solo los guías y los turistas tienen solicitudes de modificación.");
}

function findAssignment(itineraryId: number, userId: number) {
  if (findUser(userId)?.role !== "tourist") throw new ApiError(403, "Solo los turistas piden modificaciones.");
  const assignment = assignments.find(item => item.itinerary_id === itineraryId && item.user_id === userId);
  if (!assignment) throw new ApiError(404, "No tienes asignado este itinerario.");
  return assignment;
}

// The guides with some permission in the package, other than the assigned one
function supportGuides(itineraryId: string, userId: number): SupportGuide[] {
  const assignment = findAssignment(Number(itineraryId), userId);
  const itinerary = itineraryOf(assignment.itinerary_id);
  const guideIds = new Set(
    authorizations.filter(item => item.package_id === itinerary.package_id).map(item => item.guide_id),
  );
  guideIds.delete(itinerary.guide_id);

  return [...guideIds].flatMap(id => {
    const guide = findUser(id);
    return guide ? [{ id: guide.id, name: guide.name, specialty: guide.specialty ?? null }] : [];
  });
}

function create(body: ModificationRequestCreate, userId: number) {
  const assignment = findAssignment(body.itinerary_id, userId);
  const description = body.description?.trim();
  if (!description) throw new ApiError(422, "Cuéntanos qué necesitas cambiar.");

  const itinerary = itineraryOf(assignment.itinerary_id);
  if (body.support_guide_id !== null) {
    if (findUser(body.support_guide_id)?.role !== "guide") throw new ApiError(404, "El guía de apoyo no existe.");
    if (body.support_guide_id === itinerary.guide_id) throw new ApiError(422, "El guía de apoyo debe ser otro distinto al tuyo.");
  }

  const stopIds = toDays(itinerary).flatMap(day => day.stops.map(stop => stop.activity_id));
  const record: ModificationRequestRecord = {
    id: Math.max(0, ...modificationRequests.map(item => item.id)) + 1,
    itinerary_id: assignment.itinerary_id,
    tourist_id: userId,
    support_guide_id: body.support_guide_id,
    request_date: daysFromToday(0),
    description,
    activity_ids: body.activity_ids.filter(id => stopIds.includes(id)),
    status: "requested",
    result: null,
    new_itinerary_id: null,
  };
  modificationRequests.push(record);
  return toRequest(record, userId);
}

function update(id: string, body: ModificationRequestUpdate, userId: number) {
  const record = modificationRequests.find(item => item.id === Number(id));
  if (!record || findUser(userId)?.role !== "guide" || !handles(record, userId)) {
    throw new ApiError(404, "La solicitud no existe o no te toca atenderla.");
  }
  if (CLOSED.includes(record.status)) throw new ApiError(409, "La solicitud ya está cerrada.");

  const closing = CLOSED.includes(body.status);
  if (closing && !body.result?.trim()) throw new ApiError(422, "Registra el resultado antes de cerrarla.");

  // RF-31: the replacing itinerary becomes the tourist's new assignment
  if (body.status === "resolved" && body.new_itinerary_id) {
    const current = itineraryOf(record.itinerary_id);
    const replacement = itineraryOf(body.new_itinerary_id);
    if (replacement.package_id !== current.package_id || replacement.status !== "approved") {
      throw new ApiError(422, "El itinerario que lo sustituye debe estar aprobado y ser del mismo paquete.");
    }
    const assignment = assignments.find(item => item.itinerary_id === current.id && item.user_id === record.tourist_id);
    if (assignment) assignment.itinerary_id = replacement.id;
    replacement.assigned = true;
    record.new_itinerary_id = replacement.id;
  }

  record.status = body.status;
  if (closing) record.result = body.result?.trim() ?? null;
  return toRequest(record, userId);
}

export const requestRoutes: MockRoute[] = [
  { method: "GET", path: "/modification-requests", handler: ({ userId }) => list(userId) },
  {
    method: "POST",
    path: "/modification-requests",
    handler: ({ body, userId }) => create(body as ModificationRequestCreate, userId),
  },
  {
    method: "PATCH",
    path: "/modification-requests/:id",
    handler: ({ params, body, userId }) => update(params.id, body as ModificationRequestUpdate, userId),
  },
  {
    method: "GET",
    path: "/me/assignments/:id/support-guides",
    handler: ({ params, userId }) => supportGuides(params.id, userId),
  },
];
