import { ApiError } from "@/lib/api/client";
import type { GenerateItineraryRequest, ItineraryDetail } from "@/lib/api/itineraries";
import { activities } from "../data/activities";
import { generatedTemplate, itineraries, nextItineraryId } from "../data/itineraries";
import { packages } from "../data/packages";
import { CURRENT_USER_ID } from "../data/users";
import type { MockRoute } from "../types";
import { toActivity } from "./activities";

function findActivity(id: number) {
  const record = activities.find(item => item.id === id);
  if (!record) throw new ApiError(404, "La actividad no existe.");
  return toActivity(record);
}

function findItinerary(id: string) {
  const itinerary = itineraries.find(item => item.id === Number(id));
  if (!itinerary) throw new ApiError(404, "El itinerario no existe.");
  return itinerary;
}

// Always returns the template route; only the package and the requested targets change
function generate(body: GenerateItineraryRequest): ItineraryDetail {
  const pkg = packages.find(item => item.id === body.package_id);
  if (!pkg) throw new ApiError(404, "El paquete no existe.");
  if (pkg.status !== "approved") throw new ApiError(409, "El paquete todavía no está validado.");

  const days = generatedTemplate.days.map(day => ({
    day: day.day,
    date: day.date,
    stops: day.stops.map((stop, index) => {
      const activity = findActivity(stop.activity_id);
      return {
        activity_id: activity.id,
        order: index + 1,
        start_time: stop.start_time,
        activity_name: activity.name,
        attraction_name: activity.attraction_name,
        activity_type_code: activity.activity_type_code,
        effort_level: activity.effort_level,
        duration_minutes: activity.duration_minutes,
      };
    }),
  }));
  const count = days.reduce((sum, day) => sum + day.stops.length, 0);
  const categories = body.category_ids.length;

  const itinerary: ItineraryDetail = {
    id: nextItineraryId.value++,
    status: "pending",
    generated_at: new Date().toISOString(),
    submitted_date: null,
    activity_count: count,
    package_id: pkg.id,
    package_name: pkg.name,
    guide_id: CURRENT_USER_ID,
    days,
    criteria: [
      {
        key: "type_proportion",
        target: `${body.proportion_types.map(item => item.value).join(" / ")} %`,
        actual: generatedTemplate.typeProportionActual,
        ok: true,
        detail: "Tolerancia ±10 puntos",
      },
      { key: "category_coverage", target: `${categories} de ${categories}`, actual: `${categories} de ${categories}`, ok: true },
      { key: "activity_count", target: String(body.activity_count), actual: String(count), ok: body.activity_count === count },
      {
        key: "late_high_effort",
        target: body.avoid_late_high_effort ? "Ninguno tras 17:00" : "Sin límite",
        actual: "Ninguno",
        ok: true,
      },
    ],
    discarded: generatedTemplate.discarded.map(item => ({
      activity_id: item.activity_id,
      activity_name: findActivity(item.activity_id).name,
      reason: item.reason,
    })),
  };

  itineraries.push(itinerary);
  return itinerary;
}

export const itineraryRoutes: MockRoute[] = [
  { method: "POST", path: "/itineraries/generate", handler: ({ body }) => generate(body as GenerateItineraryRequest) },
  { method: "GET", path: "/itineraries/:id", handler: ({ params }) => findItinerary(params.id) },
  {
    method: "POST",
    path: "/itineraries/:id/submit",
    handler: ({ params }) => {
      const itinerary = findItinerary(params.id);
      itinerary.submitted_date = new Date().toISOString().slice(0, 10);
      return itinerary;
    },
  },
];
