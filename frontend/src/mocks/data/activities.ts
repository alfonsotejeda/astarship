import type { ReviewStatus } from "@/lib/api/packages";

export interface AttractionRecord {
  id: number;
  name: string;
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

export const attractions: AttractionRecord[] = [
  { id: 1, name: "Plaza de Armas", destination: "La Habana" },
  { id: 2, name: "Calle Obispo → Plaza Vieja", destination: "La Habana" },
  { id: 3, name: "Paladar El Patio", destination: "La Habana" },
  { id: 4, name: "Castillo de los Tres Reyes del Morro", destination: "La Habana" },
  { id: 5, name: "Edificio de Arte Cubano", destination: "La Habana" },
  { id: 6, name: "Casa de la Música", destination: "La Habana" },
  { id: 7, name: "Centro Habana", destination: "La Habana" },
  { id: 8, name: "Malecón", destination: "La Habana" },
  { id: 9, name: "Fortaleza de La Cabaña", destination: "La Habana" },
  { id: 10, name: "Fábrica Partagás", destination: "La Habana" },
];

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
];
