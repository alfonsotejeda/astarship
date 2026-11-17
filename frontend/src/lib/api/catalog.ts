import { useQuery } from "@tanstack/react-query";
import type { Attraction } from "./attractions";
import type { Category } from "./catalogs";
import { request } from "./client";
import type { EffortCounts, ItineraryDay } from "./itineraries";

// What a tourist can book: validated packages with at least one approved itinerary (RN-09)
export interface CatalogPackage {
  id: number;
  name: string;
  destination: string;
  categories: Category[];
  itinerary_count: number;
  min_days: number;
  max_days: number;
  attraction_count: number;
  // Mean of the tourists' trip ratings; null with none yet
  rating: number | null;
}

// Only approved itineraries are shown to tourists
export interface CatalogItinerary {
  id: number;
  guide_name: string;
  activity_count: number;
  effort: EffortCounts;
  rating: number | null;
  days: ItineraryDay[];
}

export interface CatalogPackageDetail extends CatalogPackage {
  itineraries: CatalogItinerary[];
  // Every attraction the package's itineraries go through
  attractions: Attraction[];
}

export function getCatalog() {
  return request<CatalogPackage[]>("/catalog/packages");
}

export function getCatalogPackage(id: number) {
  return request<CatalogPackageDetail>(`/catalog/packages/${id}`);
}

export function useCatalog() {
  return useQuery({ queryKey: ["catalog"], queryFn: getCatalog });
}

export function useCatalogPackage(id: number) {
  return useQuery({ queryKey: ["catalog", id], queryFn: () => getCatalogPackage(id) });
}
