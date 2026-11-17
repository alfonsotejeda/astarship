import type { ActivityValidationResult, DuplicateStatus } from "@/lib/api/activities";
import type { ReviewStatus } from "@/lib/api/packages";

export interface AttractionRecord {
  id: number;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  // Not in the model: it decides which packages can use the attraction's activities
  destination: string;
}

export interface ActivityRecord {
  id: number;
  name: string;
  effort_level: number;
  status: ReviewStatus;
  creation_date: string;
  activity_type_code: string;
  category_id: number;
  user_id: number;
  attraction_id: number;
  duration_minutes: number;
}

export interface ActivityValidationRecord {
  activity_id: number;
  admin_id: number;
  validation_date: string;
  result: ActivityValidationResult;
  observations: string | null;
}

export interface DuplicatePairRecord {
  id: number;
  a_id: number;
  b_id: number;
  score: number;
  status: DuplicateStatus;
  kept_id: number | null;
  resolved_date: string | null;
  resolver_id: number | null;
}

export const attractions: AttractionRecord[] = [
  { id: 1, name: "Plaza de Armas", address: "Calle Obispo esq. Tacón, La Habana Vieja", latitude: 23.1404, longitude: -82.35, destination: "La Habana" },
  { id: 2, name: "Calle Obispo → Plaza Vieja", address: "Calle Obispo y Plaza Vieja, La Habana Vieja", latitude: 23.138, longitude: -82.351, destination: "La Habana" },
  { id: 3, name: "Paladar El Patio", address: "Calle San Ignacio 54, La Habana Vieja", latitude: 23.1412, longitude: -82.3519, destination: "La Habana" },
  { id: 4, name: "Castillo de los Tres Reyes del Morro", address: "Carretera de la Cabaña, La Habana del Este", latitude: 23.15, longitude: -82.3567, destination: "La Habana" },
  { id: 5, name: "Edificio de Arte Cubano", address: "Calle Trocadero e/ Zulueta y Monserrate, La Habana", latitude: 23.1405, longitude: -82.3584, destination: "La Habana" },
  { id: 6, name: "Casa de la Música", address: "Calle Galiano 255, Centro Habana", latitude: 23.1355, longitude: -82.364, destination: "La Habana" },
  { id: 7, name: "Centro Habana", address: "Callejón de Hamel, Centro Habana", latitude: 23.134, longitude: -82.38, destination: "La Habana" },
  { id: 8, name: "Malecón", address: "Malecón y Paseo del Prado, La Habana", latitude: 23.1435, longitude: -82.368, destination: "La Habana" },
  { id: 9, name: "Fortaleza de La Cabaña", address: "Carretera de la Cabaña, La Habana del Este", latitude: 23.146, longitude: -82.351, destination: "La Habana" },
  { id: 10, name: "Fábrica Partagás", address: "Calle Industria 520, Centro Habana", latitude: 23.1325, longitude: -82.359, destination: "La Habana" },
  { id: 11, name: "Bosque de La Habana", address: "Avenida 47 y río Almendares, Nuevo Vedado", latitude: 23.115, longitude: -82.403, destination: "La Habana" },
  { id: 12, name: "Plaza de la Catedral", address: "Calle Empedrado 158, La Habana Vieja", latitude: 23.1418, longitude: -82.3524, destination: "La Habana" },
  { id: 13, name: "Museo del Ron", address: "Avenida del Puerto 262, La Habana Vieja", latitude: 23.1361, longitude: -82.3487, destination: "La Habana" },
  { id: 14, name: "Taller Experimental de Gráfica", address: "Callejón del Chorro 6, La Habana Vieja", latitude: 23.1416, longitude: -82.353, destination: "La Habana" },
  { id: 15, name: "Valle de Dos Hermanas", address: "Valle de Dos Hermanas, Viñales", latitude: 22.634, longitude: -83.738, destination: "Viñales" },
  { id: 16, name: "Cueva del Indio", address: "Carretera a Puerto Esperanza km 38, Viñales", latitude: 22.669, longitude: -83.696, destination: "Viñales" },
  { id: 17, name: "Valle de Viñales", address: "Valle de Viñales, Pinar del Río", latitude: 22.619, longitude: -83.711, destination: "Viñales" },
  { id: 18, name: "Finca Raúl Reyes", address: "Camino al Palmarito, Viñales", latitude: 22.61, longitude: -83.725, destination: "Viñales" },
  { id: 19, name: "Hotel Los Jazmines", address: "Carretera a Viñales km 23, Pinar del Río", latitude: 22.6, longitude: -83.714, destination: "Viñales" },
  { id: 20, name: "Plaza Mayor de Trinidad", address: "Plaza Mayor, Trinidad", latitude: 21.8053, longitude: -79.9846, destination: "Trinidad" },
  { id: 21, name: "Parque Guanayara", address: "Topes de Collantes, Sancti Spíritus", latitude: 21.933, longitude: -80.027, destination: "Trinidad" },
  { id: 22, name: "Valle de los Ingenios", address: "Valle de los Ingenios, Trinidad", latitude: 21.838, longitude: -79.857, destination: "Trinidad" },
  { id: 23, name: "Casa del Alfarero", address: "Calle Andrés Berro 51, Trinidad", latitude: 21.8, longitude: -79.99, destination: "Trinidad" },
  { id: 24, name: "Palacio Brunet", address: "Calle Fernando Hernández Echerri 52, Trinidad", latitude: 21.8058, longitude: -79.985, destination: "Trinidad" },
  { id: 25, name: "Parque José Martí", address: "Avenida 54 y calle 29, Cienfuegos", latitude: 22.146, longitude: -80.452, destination: "Cienfuegos" },
  { id: 26, name: "Teatro Tomás Terry", address: "Avenida 56 n.º 270, Cienfuegos", latitude: 22.1466, longitude: -80.4527, destination: "Cienfuegos" },
  { id: 27, name: "Palacio de Valle", address: "Calle 37 e/ 0 y 2, Punta Gorda, Cienfuegos", latitude: 22.122, longitude: -80.447, destination: "Cienfuegos" },
  { id: 28, name: "Castillo de Jagua", address: "Poblado de Perché, Cienfuegos", latitude: 22.048, longitude: -80.414, destination: "Cienfuegos" },
  { id: 29, name: "Jardín Botánico de Cienfuegos", address: "Carretera a Trinidad km 15, Pepito Tey", latitude: 22.125, longitude: -80.317, destination: "Cienfuegos" },
];

export const nextAttractionId = { value: 30 };

export const activities: ActivityRecord[] = [
  { id: 1, name: "Castillo de la Real Fuerza", effort_level: 1, status: "approved", creation_date: "2026-09-03", activity_type_code: "visita", category_id: 1, user_id: 1, attraction_id: 1, duration_minutes: 60 },
  { id: 2, name: "Ruta a pie por la Habana Vieja", effort_level: 2, status: "approved", creation_date: "2026-09-03", activity_type_code: "excursion", category_id: 1, user_id: 2, attraction_id: 2, duration_minutes: 120 },
  { id: 3, name: "Taller de cocina criolla", effort_level: 1, status: "approved", creation_date: "2026-09-04", activity_type_code: "taller", category_id: 2, user_id: 3, attraction_id: 3, duration_minutes: 90 },
  { id: 4, name: "Subida al Morro", effort_level: 3, status: "approved", creation_date: "2026-09-04", activity_type_code: "excursion", category_id: 1, user_id: 2, attraction_id: 4, duration_minutes: 120 },
  { id: 5, name: "Museo Nacional de Bellas Artes", effort_level: 1, status: "approved", creation_date: "2026-09-05", activity_type_code: "visita", category_id: 3, user_id: 1, attraction_id: 5, duration_minutes: 90 },
  { id: 6, name: "Clase de son cubano", effort_level: 2, status: "approved", creation_date: "2026-09-05", activity_type_code: "taller", category_id: 4, user_id: 3, attraction_id: 6, duration_minutes: 90 },
  { id: 7, name: "Callejón de Hamel", effort_level: 1, status: "approved", creation_date: "2026-09-06", activity_type_code: "visita", category_id: 3, user_id: 1, attraction_id: 7, duration_minutes: 60 },
  { id: 8, name: "Paseo en bici por el Malecón", effort_level: 2, status: "approved", creation_date: "2026-09-06", activity_type_code: "excursion", category_id: 5, user_id: 2, attraction_id: 8, duration_minutes: 120 },
  { id: 9, name: "Cañonazo de las nueve", effort_level: 2, status: "approved", creation_date: "2026-09-07", activity_type_code: "visita", category_id: 1, user_id: 1, attraction_id: 9, duration_minutes: 90 },
  { id: 10, name: "Taller de tabaco torcido", effort_level: 1, status: "approved", creation_date: "2026-09-07", activity_type_code: "taller", category_id: 6, user_id: 3, attraction_id: 10, duration_minutes: 60 },
  { id: 11, name: "Senderismo en el Parque Almendares", effort_level: 3, status: "approved", creation_date: "2026-09-08", activity_type_code: "excursion", category_id: 5, user_id: 2, attraction_id: 11, duration_minutes: 150 },
  { id: 12, name: "Catedral de La Habana", effort_level: 1, status: "approved", creation_date: "2026-09-08", activity_type_code: "visita", category_id: 1, user_id: 1, attraction_id: 12, duration_minutes: 60 },
  { id: 13, name: "Taller de coctelería cubana", effort_level: 1, status: "approved", creation_date: "2026-09-09", activity_type_code: "taller", category_id: 2, user_id: 3, attraction_id: 13, duration_minutes: 90 },
  { id: 14, name: "Taller de serigrafía", effort_level: 1, status: "approved", creation_date: "2026-09-09", activity_type_code: "taller", category_id: 3, user_id: 3, attraction_id: 14, duration_minutes: 90 },
  { id: 15, name: "Mural de la Prehistoria", effort_level: 1, status: "approved", creation_date: "2026-09-11", activity_type_code: "visita", category_id: 5, user_id: 2, attraction_id: 15, duration_minutes: 60 },
  { id: 16, name: "Cueva del Indio en bote", effort_level: 2, status: "approved", creation_date: "2026-09-11", activity_type_code: "excursion", category_id: 5, user_id: 2, attraction_id: 16, duration_minutes: 90 },
  { id: 17, name: "Ruta a caballo por el valle", effort_level: 3, status: "approved", creation_date: "2026-09-12", activity_type_code: "excursion", category_id: 5, user_id: 2, attraction_id: 17, duration_minutes: 180 },
  { id: 18, name: "Taller de cocina campesina", effort_level: 1, status: "approved", creation_date: "2026-09-12", activity_type_code: "taller", category_id: 2, user_id: 3, attraction_id: 18, duration_minutes: 90 },
  { id: 19, name: "Mirador de Los Jazmines", effort_level: 1, status: "approved", creation_date: "2026-09-13", activity_type_code: "visita", category_id: 5, user_id: 1, attraction_id: 19, duration_minutes: 45 },
  { id: 20, name: "Plaza Mayor", effort_level: 1, status: "approved", creation_date: "2026-09-16", activity_type_code: "visita", category_id: 1, user_id: 3, attraction_id: 20, duration_minutes: 60 },
  { id: 21, name: "Salto del Caburní", effort_level: 3, status: "approved", creation_date: "2026-09-16", activity_type_code: "excursion", category_id: 5, user_id: 2, attraction_id: 21, duration_minutes: 180 },
  { id: 22, name: "Tren por el Valle de los Ingenios", effort_level: 2, status: "approved", creation_date: "2026-09-17", activity_type_code: "excursion", category_id: 1, user_id: 3, attraction_id: 22, duration_minutes: 150 },
  { id: 23, name: "Taller de alfarería", effort_level: 1, status: "approved", creation_date: "2026-09-17", activity_type_code: "taller", category_id: 1, user_id: 3, attraction_id: 23, duration_minutes: 90 },
  { id: 24, name: "Museo Romántico", effort_level: 1, status: "approved", creation_date: "2026-09-18", activity_type_code: "visita", category_id: 1, user_id: 1, attraction_id: 24, duration_minutes: 60 },
  { id: 25, name: "Mirador del Morro al atardecer", effort_level: 2, status: "approved", creation_date: "2026-09-20", activity_type_code: "visita", category_id: 5, user_id: 1, attraction_id: 4, duration_minutes: 60 },
  { id: 28, name: "Paseo por el centro histórico", effort_level: 1, status: "approved", creation_date: "2026-09-25", activity_type_code: "visita", category_id: 1, user_id: 1, attraction_id: 25, duration_minutes: 90 },
  { id: 29, name: "Función en el Teatro Terry", effort_level: 1, status: "approved", creation_date: "2026-09-25", activity_type_code: "visita", category_id: 4, user_id: 3, attraction_id: 26, duration_minutes: 120 },
  { id: 30, name: "Atardecer en Punta Gorda", effort_level: 1, status: "approved", creation_date: "2026-09-26", activity_type_code: "visita", category_id: 5, user_id: 1, attraction_id: 27, duration_minutes: 60 },
  { id: 31, name: "Lancha al Castillo de Jagua", effort_level: 2, status: "approved", creation_date: "2026-09-26", activity_type_code: "excursion", category_id: 1, user_id: 2, attraction_id: 28, duration_minutes: 150 },
  { id: 32, name: "Ruta por el Jardín Botánico", effort_level: 2, status: "approved", creation_date: "2026-09-27", activity_type_code: "excursion", category_id: 5, user_id: 2, attraction_id: 29, duration_minutes: 120 },
  { id: 33, name: "Taller de danzón", effort_level: 2, status: "approved", creation_date: "2026-09-27", activity_type_code: "taller", category_id: 4, user_id: 3, attraction_id: 25, duration_minutes: 90 },
  // New and waiting for the administrator (#156); each one is in a duplicate pair (P-21)
  { id: 26, name: "Recorrido por la Plaza Vieja", effort_level: 2, status: "pending", creation_date: "2026-10-28", activity_type_code: "excursion", category_id: 1, user_id: 3, attraction_id: 2, duration_minutes: 90 },
  { id: 27, name: "Taller de son en la Casa de la Música", effort_level: 1, status: "pending", creation_date: "2026-10-30", activity_type_code: "taller", category_id: 4, user_id: 1, attraction_id: 6, duration_minutes: 90 },
];

// Activities removed by a merge; kept so the resolved pairs still show both sides
export const removedActivities: ActivityRecord[] = [
  { id: 90, name: "Visita al Castillo de la Real Fuerza", effort_level: 1, status: "pending", creation_date: "2026-09-25", activity_type_code: "visita", category_id: 1, user_id: 2, attraction_id: 1, duration_minutes: 60 },
];

export const activityValidations: ActivityValidationRecord[] = [
  { activity_id: 25, admin_id: 4, validation_date: "2026-09-21", result: "approved", observations: null },
];

export const duplicatePairs: DuplicatePairRecord[] = [
  { id: 1, a_id: 2, b_id: 26, score: 92, status: "pending", kept_id: null, resolved_date: null, resolver_id: null },
  { id: 2, a_id: 6, b_id: 27, score: 87, status: "pending", kept_id: null, resolved_date: null, resolver_id: null },
  { id: 3, a_id: 1, b_id: 90, score: 89, status: "merged", kept_id: 1, resolved_date: "2026-09-26", resolver_id: 4 },
  { id: 4, a_id: 4, b_id: 25, score: 48, status: "dismissed", kept_id: null, resolved_date: "2026-09-21", resolver_id: 4 },
];

export const nextActivityId = { value: 34 };
export const nextDuplicatePairId = { value: 5 };

export function findActivityRecord(id: number) {
  return activities.find(activity => activity.id === id) ?? removedActivities.find(activity => activity.id === id);
}
