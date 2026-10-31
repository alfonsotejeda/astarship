import { ApiError } from "@/lib/api/client";
import type {
  EffortCounts,
  GenerateItineraryRequest,
  ItineraryCriterion,
  ItineraryDay,
  ItineraryDetail,
  ItinerarySummary,
  ReviewAction,
  ReviewRequest,
} from "@/lib/api/itineraries";
import { findActivityRecord } from "../data/activities";
import { activityTypes, categories } from "../data/catalogs";
import { GENERATED_DISCARDED, GENERATED_ROUTES, itineraries, nextItineraryId, reviews, route } from "../data/itineraries";
import type { ItineraryRecord } from "../data/itineraries";
import { findPackage } from "../data/packages";
import { authorizations, findUser } from "../data/users";
import type { MockRoute } from "../types";
import { toActivity } from "./activities";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function authorization(userId: number, packageId: number) {
  return authorizations.find(item => item.guide_id === userId && item.package_id === packageId);
}

function activity(id: number) {
  const record = findActivityRecord(id);
  if (!record) throw new ApiError(404, "La actividad no existe.");
  return toActivity(record);
}

function packageOf(record: ItineraryRecord) {
  const pkg = findPackage(record.package_id);
  if (!pkg) throw new ApiError(404, "El paquete no existe.");
  return pkg;
}

// RNF-10: the manager and the admin see everything; a guide, the packages where they are authorized
function isVisible(record: ItineraryRecord, userId: number) {
  const role = findUser(userId)?.role;
  if (role === "manager" || role === "admin") return true;
  return role === "guide" && (record.guide_id === userId || authorization(userId, record.package_id) !== undefined);
}

// RN-07 and RN-10: only who holds the permission in the package and did not generate the itinerary
function reviewAction(record: ItineraryRecord, userId: number): ReviewAction | null {
  const role = findUser(userId)?.role;
  if (role === "manager") return record.status === "validated" ? "approve" : null;

  const canValidate = authorization(userId, record.package_id)?.can_validate ?? false;
  const isSubmitted = record.status === "pending" && record.submitted_date !== null;
  return role === "guide" && canValidate && record.guide_id !== userId && isSubmitted ? "validate" : null;
}

function findVisible(id: string, userId: number) {
  const record = itineraries.find(item => item.id === Number(id));
  if (!record || !isVisible(record, userId)) throw new ApiError(404, "El itinerario no existe o no puedes verlo.");
  return record;
}

function toDays(record: ItineraryRecord): ItineraryDay[] {
  return record.days.map((day, index) => ({
    day: index + 1,
    date: day.date,
    stops: day.stops.map(([activityId, startTime], order) => {
      const item = activity(activityId);
      return {
        activity_id: item.id,
        order: order + 1,
        start_time: `${startTime}:00`,
        activity_name: item.name,
        attraction_name: item.attraction_name,
        activity_type_code: item.activity_type_code,
        effort_level: item.effort_level,
        duration_minutes: item.duration_minutes,
      };
    }),
  }));
}

function activityCount(record: ItineraryRecord) {
  return record.days.reduce((sum, day) => sum + day.stops.length, 0);
}

function effortCounts(record: ItineraryRecord): EffortCounts {
  const counts = { low: 0, medium: 0, high: 0 };
  record.days.flatMap(day => day.stops).forEach(([activityId]) => {
    const level = activity(activityId).effort_level;
    if (level <= 1) counts.low++;
    else if (level === 2) counts.medium++;
    else counts.high++;
  });
  return counts;
}

function proportionTypes(record: ItineraryRecord) {
  return activityTypes.map((type, index) => ({ activity_type_code: type.code, value: record.proportion[index] ?? 0 }));
}

function criteria(record: ItineraryRecord): ItineraryCriterion[] {
  const count = String(activityCount(record));
  const coverage = `${packageOf(record).category_ids.length} de ${packageOf(record).category_ids.length}`;
  const proportion = `${record.proportion.join(" / ")} %`;

  const met: ItineraryCriterion[] = [
    { key: "type_proportion", target: proportion, actual: proportion, ok: true, detail: "Tolerancia ±10 puntos" },
    { key: "category_coverage", target: coverage, actual: coverage, ok: true },
    { key: "activity_count", target: count, actual: count, ok: true },
    {
      key: "late_high_effort",
      target: record.avoid_late_high_effort ? "Ninguno tras 17:00" : "Sin límite",
      actual: "Ninguno",
      ok: true,
    },
  ];

  return met.map(criterion => {
    const failed = record.failed?.[criterion.key];
    return failed ? { ...criterion, ok: false, actual: failed.actual, detail: failed.detail ?? criterion.detail } : criterion;
  });
}

function lastReview(itineraryId: number) {
  return reviews
    .filter(review => review.itinerary_id === itineraryId)
    .sort((a, b) => b.review_date.localeCompare(a.review_date))[0];
}

function toSummary(record: ItineraryRecord, userId: number): ItinerarySummary {
  const pkg = packageOf(record);
  const recordCriteria = criteria(record);

  return {
    id: record.id,
    status: record.status,
    assigned: record.assigned,
    creation_date: record.generated_at.slice(0, 10),
    submitted_date: record.submitted_date,
    package_id: pkg.id,
    package_name: pkg.name,
    guide_id: record.guide_id,
    guide_name: findUser(record.guide_id)?.name ?? "",
    is_mine: record.guide_id === userId,
    review: reviewAction(record, userId),
    days: record.days.length,
    activity_count: activityCount(record),
    effort: effortCounts(record),
    proportion_types: proportionTypes(record),
    criteria_met: recordCriteria.filter(criterion => criterion.ok).length,
    criteria_total: recordCriteria.length,
  };
}

function toDetail(record: ItineraryRecord, userId: number): ItineraryDetail {
  const pkg = packageOf(record);
  const history = itineraries
    .filter(item => item.package_id === record.package_id && item.id !== record.id && isVisible(item, userId))
    .sort((a, b) => b.generated_at.localeCompare(a.generated_at))
    .slice(0, 3);

  return {
    id: record.id,
    status: record.status,
    assigned: record.assigned,
    generated_at: record.generated_at,
    submitted_date: record.submitted_date,
    activity_count: activityCount(record),
    package_id: pkg.id,
    package_name: pkg.name,
    package_categories: categories.filter(category => pkg.category_ids.includes(category.id)).map(category => category.name),
    guide_id: record.guide_id,
    guide_name: findUser(record.guide_id)?.name ?? "",
    is_mine: record.guide_id === userId,
    review: reviewAction(record, userId),
    replaces_id: record.replaces_id,
    proportion_types: proportionTypes(record),
    avoid_late_high_effort: record.avoid_late_high_effort,
    days: toDays(record),
    criteria: criteria(record),
    discarded: (record.discarded ?? []).map(item => ({
      activity_id: item.activity_id,
      activity_name: activity(item.activity_id).name,
      reason: item.reason,
    })),
    history: history.map(item => ({
      itinerary_id: item.id,
      date: item.generated_at.slice(0, 10),
      status: item.status,
      assigned: item.assigned,
      observations: lastReview(item.id)?.observations ?? null,
    })),
  };
}

// Always returns the package's sample route; only the parameters change
function generate(body: GenerateItineraryRequest, userId: number) {
  const pkg = findPackage(body.package_id);
  if (!pkg) throw new ApiError(404, "El paquete no existe.");
  if (pkg.status !== "approved") throw new ApiError(409, "El paquete todavía no está validado.");
  if (!authorization(userId, pkg.id)?.can_generate) throw new ApiError(403, "No puedes generar itinerarios en este paquete.");

  const proportion = activityTypes.map(
    type => body.proportion_types.find(item => item.activity_type_code === type.code)?.value ?? 0,
  ) as ItineraryRecord["proportion"];

  const record: ItineraryRecord = {
    id: nextItineraryId.value++,
    package_id: pkg.id,
    guide_id: userId,
    status: "pending",
    assigned: false,
    generated_at: new Date().toISOString(),
    submitted_date: null,
    replaces_id: null,
    proportion,
    avoid_late_high_effort: body.avoid_late_high_effort,
    days: route(today(), GENERATED_ROUTES[pkg.id] ?? []),
    discarded: GENERATED_DISCARDED[pkg.id],
  };

  const count = activityCount(record);
  if (count !== body.activity_count) record.failed = { activity_count: { actual: String(count) } };

  itineraries.unshift(record);
  return toDetail(record, userId);
}

function submit(id: string, userId: number) {
  const record = findVisible(id, userId);
  if (record.guide_id !== userId) throw new ApiError(403, "Solo quien generó el itinerario puede enviarlo a revisión.");
  if (record.status !== "pending") throw new ApiError(409, "El itinerario ya se revisó.");

  record.submitted_date = today();
  return toDetail(record, userId);
}

function review(id: string, body: ReviewRequest, userId: number) {
  const record = findVisible(id, userId);
  const action = reviewAction(record, userId);
  if (!action) throw new ApiError(403, "No puedes revisar este itinerario.");

  const approved = action === "validate" ? "validated" : "approved";
  record.status = body.result === "approve" ? approved : "rejected";
  reviews.push({
    itinerary_id: record.id,
    reviewer_id: userId,
    review_date: today(),
    result: record.status,
    observations: body.observations || null,
  });
  return toDetail(record, userId);
}

export const itineraryRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/itineraries",
    handler: ({ userId }) =>
      itineraries.filter(record => isVisible(record, userId)).map(record => toSummary(record, userId)),
  },
  { method: "GET", path: "/itineraries/:id", handler: ({ params, userId }) => toDetail(findVisible(params.id, userId), userId) },
  {
    method: "POST",
    path: "/itineraries/generate",
    handler: ({ body, userId }) => generate(body as GenerateItineraryRequest, userId),
  },
  { method: "POST", path: "/itineraries/:id/submit", handler: ({ params, userId }) => submit(params.id, userId) },
  {
    method: "POST",
    path: "/itineraries/:id/validations",
    handler: ({ params, body, userId }) => review(params.id, body as ReviewRequest, userId),
  },
];
