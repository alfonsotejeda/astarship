import type { MapPoint } from "@/components/AttractionMap/AttractionMap";
import type { Attraction, AttractionForm } from "@/lib/api/attractions";
import type { ItineraryStop } from "@/lib/api/itineraries";
import type { TravelMode } from "@/lib/api/trips";

// The form keeps what the user types; it becomes numbers when saved
export type AttractionDraft = { name: string; address: string; latitude: string; longitude: string };

export const EMPTY_DRAFT: AttractionDraft = { name: "", address: "", latitude: "", longitude: "" };

export const TRAVEL_MODE_LABEL: Record<TravelMode, string> = { walk: "A pie", taxi: "En taxi", bus: "En autobús" };

export function toDraft(attraction: Attraction): AttractionDraft {
  return {
    name: attraction.name,
    address: attraction.address,
    latitude: String(attraction.latitude),
    longitude: String(attraction.longitude),
  };
}

function coordinate(value: string, limit: number) {
  const number = Number(value.replace(",", "."));
  return value.trim() && Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
}

export function draftErrors(draft: AttractionDraft) {
  const hasLocation = coordinate(draft.latitude, 90) !== null && coordinate(draft.longitude, 180) !== null;
  return {
    name: draft.name.trim() ? undefined : "Escribe el nombre de la atracción.",
    address: draft.address.trim() ? undefined : "Escribe la dirección.",
    location: hasLocation ? undefined : "Marca la ubicación en el mapa o escribe sus coordenadas.",
  };
}

// Null while the draft has errors
export function toForm(draft: AttractionDraft): AttractionForm | null {
  const latitude = coordinate(draft.latitude, 90);
  const longitude = coordinate(draft.longitude, 180);
  if (!draft.name.trim() || !draft.address.trim() || latitude === null || longitude === null) return null;
  return { name: draft.name.trim(), address: draft.address.trim(), latitude, longitude };
}

export function draftPosition(draft: AttractionDraft) {
  const lat = coordinate(draft.latitude, 90);
  const lng = coordinate(draft.longitude, 180);
  return lat !== null && lng !== null ? { lat, lng } : null;
}

export function attractionPoint(attraction: Attraction, highlighted = false): MapPoint {
  return {
    id: attraction.id,
    lat: attraction.latitude,
    lng: attraction.longitude,
    label: attraction.name,
    to: `/attractions/${attraction.id}`,
    highlighted,
  };
}

// The stops of a day in order, placed at their attractions; a stop without one is left out
export function stopPoints(stops: ItineraryStop[], attractions: Attraction[], currentId?: number): MapPoint[] {
  return stops.flatMap(stop => {
    const attraction = attractions.find(item => item.id === stop.attraction_id);
    if (!attraction) return [];
    return [
      {
        id: `${stop.order}-${stop.activity_id}`,
        lat: attraction.latitude,
        lng: attraction.longitude,
        label: `${stop.activity_name} · ${attraction.name}`,
        to: `/attractions/${attraction.id}`,
        highlighted: currentId === undefined || stop.activity_id === currentId,
      },
    ];
  });
}

export function attractionsText(count: number) {
  return count === 1 ? "1 atracción" : `${count} atracciones`;
}
