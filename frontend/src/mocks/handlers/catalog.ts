import { ApiError } from "@/lib/api/client";
import type { CatalogItinerary, CatalogPackage, CatalogPackageDetail } from "@/lib/api/catalog";
import { attractions, findActivityRecord } from "../data/activities";
import { assignments } from "../data/assignments";
import { categories } from "../data/catalogs";
import { itineraries } from "../data/itineraries";
import type { ItineraryRecord } from "../data/itineraries";
import { packages } from "../data/packages";
import type { PackageRecord } from "../data/packages";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";
import { toAttraction } from "./attractions";
import { activityCount, effortCounts, toDays } from "./itineraries";

function approvedItineraries(packageId: number) {
  return itineraries.filter(item => item.package_id === packageId && item.status === "approved");
}

function mean(values: number[]) {
  return values.length === 0 ? null : values.reduce((sum, value) => sum + value, 0) / values.length;
}

// The tourists' overall rating of the trips made with these itineraries
function rating(items: ItineraryRecord[]) {
  const ids = items.map(item => item.id);
  return mean(assignments.filter(item => ids.includes(item.itinerary_id) && item.rating !== null).map(item => item.rating ?? 0));
}

function attractionIds(items: ItineraryRecord[]) {
  const ids = items.flatMap(item => item.days.flatMap(day => day.stops.map(([activityId]) => findActivityRecord(activityId)?.attraction_id)));
  return [...new Set(ids.filter(id => id !== undefined))];
}

// RN-09: only validated packages with something to assign are offered
function isOffered(pkg: PackageRecord) {
  return pkg.status === "approved" && approvedItineraries(pkg.id).length > 0;
}

function toCatalogPackage(pkg: PackageRecord): CatalogPackage {
  const items = approvedItineraries(pkg.id);
  const days = items.map(item => item.days.length);
  return {
    id: pkg.id,
    name: pkg.name,
    destination: pkg.destination,
    categories: categories.filter(category => pkg.category_ids.includes(category.id)),
    itinerary_count: items.length,
    min_days: Math.min(...days),
    max_days: Math.max(...days),
    attraction_count: attractionIds(items).length,
    rating: rating(items),
  };
}

function toCatalogItinerary(record: ItineraryRecord): CatalogItinerary {
  return {
    id: record.id,
    guide_name: findUser(record.guide_id)?.name ?? "",
    activity_count: activityCount(record),
    effort: effortCounts(record),
    rating: rating([record]),
    days: toDays(record),
  };
}

function detail(id: string, userId: number): CatalogPackageDetail {
  const pkg = packages.find(item => item.id === Number(id));
  if (!pkg || !isOffered(pkg)) throw new ApiError(404, "Este paquete no está disponible.");

  const items = approvedItineraries(pkg.id);
  return {
    ...toCatalogPackage(pkg),
    itineraries: items.map(toCatalogItinerary),
    attractions: attractionIds(items).flatMap(attractionId => {
      const record = attractions.find(item => item.id === attractionId);
      return record ? [toAttraction(record, userId)] : [];
    }),
  };
}

export const catalogPackageRoutes: MockRoute[] = [
  { method: "GET", path: "/catalog/packages", handler: () => packages.filter(isOffered).map(toCatalogPackage) },
  { method: "GET", path: "/catalog/packages/:id", handler: ({ params, userId }) => detail(params.id, userId) },
];
