import { ApiError } from "@/lib/api/client";
import type { Activity, ActivityForm, ActivityValidationRequest, DuplicatePair } from "@/lib/api/activities";
import { isPossibleDuplicate, nameSimilarity } from "@/lib/activity";
import {
  activities,
  activityValidations,
  attractions,
  duplicatePairs,
  findActivityRecord,
  nextActivityId,
  nextDuplicatePairId,
  removedActivities,
} from "../data/activities";
import type { ActivityRecord, DuplicatePairRecord } from "../data/activities";
import { activityTypes, categories } from "../data/catalogs";
import { itineraries } from "../data/itineraries";
import { packages } from "../data/packages";
import { findUser, users } from "../data/users";
import type { MockRoute } from "../types";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function role(userId: number) {
  return findUser(userId)?.role;
}

function uses(activityId: number) {
  return itineraries
    .filter(item => item.status === "approved")
    .flatMap(item => item.days.flatMap(day => day.stops))
    .filter(([id]) => id === activityId).length;
}

function lastValidation(activityId: number) {
  const last = activityValidations
    .filter(item => item.activity_id === activityId)
    .sort((a, b) => b.validation_date.localeCompare(a.validation_date))[0];
  if (!last) return null;

  return {
    reviewer_name: findUser(last.admin_id)?.name ?? "",
    validation_date: last.validation_date,
    result: last.result,
    observations: last.observations,
  };
}

export function toActivity(record: ActivityRecord): Activity {
  return {
    ...record,
    attraction_name: attractions.find(item => item.id === record.attraction_id)?.name ?? null,
    author_name: users.find(item => item.id === record.user_id)?.name ?? null,
    uses: uses(record.id),
    last_validation: lastValidation(record.id),
  };
}

// An activity is usable in a package when its attraction is in the package's destination
function inPackage(activity: ActivityRecord, packageId: number) {
  const pkg = packages.find(item => item.id === packageId);
  if (!pkg) throw new ApiError(404, "El paquete no existe.");
  return attractions.find(item => item.id === activity.attraction_id)?.destination === pkg.destination;
}

// RNF-10: everyone sees the approved ones; a guide also sees their own, the admin all of them
function isVisible(record: ActivityRecord, userId: number) {
  return record.status === "approved" || record.user_id === userId || role(userId) === "admin";
}

function checkForm(form: Partial<ActivityForm>) {
  if (!form.name?.trim()) throw new ApiError(422, "La actividad necesita un nombre.");
  if (!attractions.some(item => item.id === form.attraction_id)) throw new ApiError(422, "Elige una atracción.");
  if (!activityTypes.some(item => item.code === form.activity_type_code)) throw new ApiError(422, "Elige un tipo.");
  if (!categories.some(item => item.id === form.category_id)) throw new ApiError(422, "Elige una categoría.");
  if (![1, 2, 3].includes(form.effort_level ?? 0)) throw new ApiError(422, "Elige el esfuerzo físico.");
  if (!form.duration_minutes || form.duration_minutes <= 0) {
    throw new ApiError(422, "La duración tiene que ser mayor que cero.");
  }
}

// RN-03: the same name at the same attraction is the same activity (UQ Name, ID_Attraction)
function checkUnique(form: ActivityForm, exceptId: number | null) {
  const name = form.name.trim().toLowerCase();
  const same = activities.find(
    item => item.id !== exceptId && item.attraction_id === form.attraction_id && item.name.toLowerCase() === name,
  );
  if (same) throw new ApiError(409, `Ya existe «${same.name}» en esa atracción.`);
}

function openPairs(record: ActivityRecord) {
  for (const other of activities) {
    if (other.id === record.id || !isPossibleDuplicate(record, other)) continue;
    const exists = duplicatePairs.some(
      pair => pair.status === "pending" && [pair.a_id, pair.b_id].includes(record.id) && [pair.a_id, pair.b_id].includes(other.id),
    );
    if (exists) continue;
    duplicatePairs.push({
      id: nextDuplicatePairId.value++,
      a_id: other.id,
      b_id: record.id,
      score: nameSimilarity(other.name, record.name),
      status: "pending",
      kept_id: null,
      resolved_date: null,
      resolver_id: null,
    });
  }
}

function fields(form: ActivityForm) {
  return {
    name: form.name.trim(),
    attraction_id: form.attraction_id,
    activity_type_code: form.activity_type_code,
    category_id: form.category_id,
    effort_level: form.effort_level,
    duration_minutes: form.duration_minutes,
  };
}

function create(form: Partial<ActivityForm>, userId: number) {
  if (role(userId) !== "guide") throw new ApiError(403, "Solo los guías describen actividades.");
  checkForm(form);
  checkUnique(form as ActivityForm, null);

  // Born pending until the administrator reviews it (#156)
  const record: ActivityRecord = {
    id: nextActivityId.value++,
    ...fields(form as ActivityForm),
    status: "pending",
    creation_date: today(),
    user_id: userId,
  };
  activities.push(record);
  openPairs(record);
  return toActivity(record);
}

function findVisible(id: string, userId: number) {
  const record = activities.find(item => item.id === Number(id));
  if (!record || !isVisible(record, userId)) throw new ApiError(404, "La actividad no existe o no puedes verla.");
  return record;
}

function update(id: string, form: Partial<ActivityForm>, userId: number) {
  const record = findVisible(id, userId);
  // RN-01
  if (record.user_id !== userId) throw new ApiError(403, "Solo puedes editar las actividades que describiste tú.");
  checkForm(form);
  checkUnique(form as ActivityForm, record.id);

  Object.assign(record, fields(form as ActivityForm));
  // A rejected activity goes back to the administrator once it is corrected
  if (record.status === "rejected") record.status = "pending";
  openPairs(record);
  return toActivity(record);
}

function requireAdmin(userId: number) {
  if (role(userId) !== "admin") throw new ApiError(403, "Solo el administrador revisa las actividades.");
}

function validate(id: string, body: ActivityValidationRequest, userId: number) {
  requireAdmin(userId);
  const record = findVisible(id, userId);
  if (record.status !== "pending") throw new ApiError(409, "La actividad no está pendiente de validar.");
  if (body.result === "rejected" && !body.observations.trim()) {
    throw new ApiError(422, "Para rechazar la actividad hay que escribir observaciones.");
  }

  record.status = body.result;
  activityValidations.push({
    activity_id: record.id,
    admin_id: userId,
    validation_date: today(),
    result: body.result,
    observations: body.observations.trim() || null,
  });
  return toActivity(record);
}

function toPair(record: DuplicatePairRecord): DuplicatePair {
  const a = findActivityRecord(record.a_id);
  const b = findActivityRecord(record.b_id);
  if (!a || !b) throw new ApiError(500, "El par de duplicados apunta a una actividad que no existe.");

  return {
    id: record.id,
    score: record.score,
    status: record.status,
    a: toActivity(a),
    b: toActivity(b),
    kept_id: record.kept_id,
    resolved_date: record.resolved_date,
    resolver_name: record.resolver_id === null ? null : (findUser(record.resolver_id)?.name ?? null),
  };
}

// RF-06, RN-03: the uses move to the activity that is kept and the other one is removed
function merge(id: string, body: { into?: number }, userId: number) {
  requireAdmin(userId);
  const removed = activities.find(item => item.id === Number(id));
  const kept = activities.find(item => item.id === body.into);
  if (!removed || !kept) throw new ApiError(404, "La actividad no existe.");
  if (removed.id === kept.id) throw new ApiError(422, "No se puede fusionar una actividad consigo misma.");

  for (const itinerary of itineraries) {
    for (const day of itinerary.days) {
      day.stops = day.stops.map(([activityId, time]): [number, string] => [
        activityId === removed.id ? kept.id : activityId,
        time,
      ]);
    }
  }

  activities.splice(activities.indexOf(removed), 1);
  removedActivities.push(removed);

  for (const pair of duplicatePairs) {
    if (pair.status !== "pending" || ![pair.a_id, pair.b_id].includes(removed.id)) continue;
    const isThisPair = [pair.a_id, pair.b_id].includes(kept.id);
    pair.status = isThisPair ? "merged" : "dismissed";
    pair.kept_id = isThisPair ? kept.id : null;
    pair.resolved_date = today();
    pair.resolver_id = userId;
  }

  return toActivity(kept);
}

function dismiss(pairId: string, userId: number) {
  requireAdmin(userId);
  const pair = duplicatePairs.find(item => item.id === Number(pairId));
  if (!pair) throw new ApiError(404, "El par de duplicados no existe.");
  if (pair.status !== "pending") throw new ApiError(409, "Este par ya está resuelto.");

  pair.status = "dismissed";
  pair.resolved_date = today();
  pair.resolver_id = userId;
  return toPair(pair);
}

export const activityRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/activities",
    handler: ({ query, userId }) => {
      const packageId = query.get("package");
      const status = query.get("status");
      return activities
        .filter(item => isVisible(item, userId))
        .filter(item => !packageId || inPackage(item, Number(packageId)))
        .filter(item => !status || item.status === status)
        .map(toActivity);
    },
  },
  { method: "POST", path: "/activities", handler: ({ body, userId }) => create(body as Partial<ActivityForm>, userId) },
  {
    method: "PATCH",
    path: "/activities/:id",
    handler: ({ params, body, userId }) => update(params.id, body as Partial<ActivityForm>, userId),
  },
  {
    method: "POST",
    path: "/activities/:id/validations",
    handler: ({ params, body, userId }) => validate(params.id, body as ActivityValidationRequest, userId),
  },
  {
    method: "GET",
    path: "/activities/duplicates",
    handler: ({ userId }) => {
      requireAdmin(userId);
      return duplicatePairs.map(toPair);
    },
  },
  {
    method: "POST",
    path: "/activities/:id/merge",
    handler: ({ params, body, userId }) => merge(params.id, body as { into?: number }, userId),
  },
  {
    method: "POST",
    path: "/activities/duplicates/:id/dismiss",
    handler: ({ params, userId }) => dismiss(params.id, userId),
  },
];
