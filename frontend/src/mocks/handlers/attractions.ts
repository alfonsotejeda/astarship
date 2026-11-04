import { ApiError } from "@/lib/api/client";
import type { Attraction, AttractionConnection, AttractionDetail, AttractionForm } from "@/lib/api/attractions";
import { activities, attractions, nextAttractionId } from "../data/activities";
import type { AttractionRecord } from "../data/activities";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";
import { toActivity } from "./activities";

type Position = { latitude: number; longitude: number };

function role(userId: number) {
  return findUser(userId)?.role;
}

function findAttraction(id: string) {
  const record = attractions.find(item => item.id === Number(id));
  if (!record) throw new ApiError(404, "La atracción no existe.");
  return record;
}

// RNF-10: everyone sees the approved activities; a guide also their own, the admin all of them
function visibleActivities(attractionId: number, userId: number) {
  return activities.filter(
    item =>
      item.attraction_id === attractionId &&
      (item.status === "approved" || item.user_id === userId || role(userId) === "admin"),
  );
}

export function toAttraction(record: AttractionRecord, userId: number): Attraction {
  return {
    id: record.id,
    name: record.name,
    address: record.address,
    latitude: record.latitude,
    longitude: record.longitude,
    activity_count: visibleActivities(record.id, userId).length,
  };
}

function distanceKm(a: Position, b: Position) {
  const toRadians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = toRadians(b.latitude - a.latitude);
  const dLng = toRadians(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(toRadians(a.latitude)) * Math.cos(toRadians(b.latitude)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(h));
}

// The network (RF-32) is kept apart from the tables (RNF-02); here it is rebuilt from geographic proximity
function connections(record: AttractionRecord): AttractionConnection[] {
  return attractions
    .filter(item => item.id !== record.id && item.destination === record.destination)
    .map(item => {
      const km = distanceKm(record, item);
      const walk = km <= 1.2;
      return {
        attraction_id: item.id,
        name: item.name,
        minutes: walk ? Math.max(3, Math.round(km * 14)) : Math.round(6 + km * 3),
        cost: walk ? 0 : Math.round(2 + km * 1.5),
        mode: walk ? ("walk" as const) : ("taxi" as const),
      };
    })
    .sort((a, b) => a.minutes - b.minutes)
    .slice(0, 4);
}

function toDetail(record: AttractionRecord, userId: number): AttractionDetail {
  return {
    ...toAttraction(record, userId),
    activities: visibleActivities(record.id, userId).map(toActivity),
    connections: connections(record),
  };
}

function checkForm(form: Partial<AttractionForm>, exceptId?: number): AttractionForm {
  const name = form.name?.trim();
  const address = form.address?.trim();
  if (!name) throw new ApiError(422, "La atracción necesita un nombre.");
  if (!address) throw new ApiError(422, "La atracción necesita una dirección.");
  const { latitude, longitude } = form;
  if (typeof latitude !== "number" || Math.abs(latitude) > 90 || typeof longitude !== "number" || Math.abs(longitude) > 180) {
    throw new ApiError(422, "La ubicación no es válida.");
  }
  const repeated = attractions.some(
    item => item.id !== exceptId && item.name.toLowerCase() === name.toLowerCase(),
  );
  if (repeated) throw new ApiError(409, `Ya existe una atracción llamada «${name}».`);
  return { name, address, latitude, longitude };
}

// RF-01: guides register attractions
function create(body: Partial<AttractionForm>, userId: number) {
  if (role(userId) !== "guide") throw new ApiError(403, "Solo los guías registran atracciones.");
  const form = checkForm(body);
  // The destination follows the closest attraction, so its activities fit that destination's packages
  const closest = [...attractions].sort((a, b) => distanceKm(form, a) - distanceKm(form, b))[0];

  const record: AttractionRecord = { id: nextAttractionId.value++, ...form, destination: closest?.destination ?? "" };
  attractions.push(record);
  return toAttraction(record, userId);
}

function update(id: string, body: Partial<AttractionForm>, userId: number) {
  if (role(userId) !== "admin") throw new ApiError(403, "Solo el administrador edita atracciones.");
  const record = findAttraction(id);
  Object.assign(record, checkForm(body, record.id));
  return toAttraction(record, userId);
}

function remove(id: string, userId: number) {
  if (role(userId) !== "admin") throw new ApiError(403, "Solo el administrador borra atracciones.");
  const record = findAttraction(id);
  const count = activities.filter(item => item.attraction_id === record.id).length;
  if (count > 0) {
    throw new ApiError(409, `En «${record.name}» se hacen ${count === 1 ? "1 actividad" : `${count} actividades`}: muévelas antes de borrarla.`);
  }
  attractions.splice(attractions.indexOf(record), 1);
  return undefined;
}

export const attractionRoutes: MockRoute[] = [
  { method: "GET", path: "/attractions", handler: ({ userId }) => attractions.map(item => toAttraction(item, userId)) },
  { method: "GET", path: "/attractions/:id", handler: ({ params, userId }) => toDetail(findAttraction(params.id), userId) },
  { method: "POST", path: "/attractions", handler: ({ body, userId }) => create(body as Partial<AttractionForm>, userId) },
  {
    method: "PATCH",
    path: "/attractions/:id",
    handler: ({ params, body, userId }) => update(params.id, body as Partial<AttractionForm>, userId),
  },
  { method: "DELETE", path: "/attractions/:id", handler: ({ params, userId }) => remove(params.id, userId) },
];
