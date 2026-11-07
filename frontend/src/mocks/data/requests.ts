import type { ModificationRequestStatus } from "@/lib/api/requests";
import { daysFromToday } from "./assignments";

export interface ModificationRequestRecord {
  id: number;
  itinerary_id: number;
  tourist_id: number;
  // The extra guide asked for (RF-30); the assigned one is the itinerary's guide
  support_guide_id: number | null;
  request_date: string;
  description: string;
  activity_ids: number[];
  status: ModificationRequestStatus;
  result: string | null;
  new_itinerary_id: number | null;
}

// From the artboards: Laura Pérez handles the first five, Daniel Ortega is the demo tourist
export const modificationRequests: ModificationRequestRecord[] = [
  {
    id: 1,
    itinerary_id: 142,
    tourist_id: 7,
    support_guide_id: null,
    request_date: daysFromToday(0),
    description: "Tengo una lesión de rodilla: pido cambiar la Subida al Morro por una actividad de esfuerzo bajo.",
    activity_ids: [4],
    status: "in_progress",
    result: null,
    new_itinerary_id: null,
  },
  {
    id: 2,
    itinerary_id: 148,
    tourist_id: 13,
    support_guide_id: 1,
    request_date: daysFromToday(0),
    description: "Viajo con mi madre de 72 años. ¿Se puede quitar el Mogote Dos Hermanas a pie y añadir una visita?",
    activity_ids: [15],
    status: "requested",
    result: null,
    new_itinerary_id: null,
  },
  {
    id: 3,
    itinerary_id: 142,
    tourist_id: 9,
    support_guide_id: null,
    request_date: daysFromToday(-1),
    description: "Me gustaría hacer la clase de son el día 1 en lugar del día 3.",
    activity_ids: [6],
    status: "requested",
    result: null,
    new_itinerary_id: null,
  },
  {
    id: 4,
    itinerary_id: 142,
    tourist_id: 8,
    support_guide_id: null,
    request_date: daysFromToday(-2),
    description: "Quiero adelantar el taller de cocina al día 1.",
    activity_ids: [3],
    status: "resolved",
    result: "Taller movido al día 1 a las 12:30. Itinerario reasignado.",
    new_itinerary_id: null,
  },
  {
    id: 5,
    itinerary_id: 128,
    tourist_id: 12,
    support_guide_id: 1,
    request_date: daysFromToday(-14),
    description: "Pido añadir una excursión a Varadero.",
    activity_ids: [],
    status: "denied",
    result: "Varadero no está en el paquete La Habana colonial.",
    new_itinerary_id: null,
  },
  {
    id: 6,
    itinerary_id: 128,
    tourist_id: 6,
    support_guide_id: null,
    request_date: daysFromToday(-132),
    description: "Quiero hacer el taller de cocina el día 1.",
    activity_ids: [3],
    status: "resolved",
    result: "Taller movido al día 1 a las 13:00.",
    new_itinerary_id: null,
  },
];
