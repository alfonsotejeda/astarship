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
  { id: 11, name: "Bosque de La Habana", destination: "La Habana" },
  { id: 12, name: "Plaza de la Catedral", destination: "La Habana" },
  { id: 13, name: "Museo del Ron", destination: "La Habana" },
  { id: 14, name: "Taller Experimental de Gráfica", destination: "La Habana" },
  { id: 15, name: "Valle de Dos Hermanas", destination: "Viñales" },
  { id: 16, name: "Cueva del Indio", destination: "Viñales" },
  { id: 17, name: "Valle de Viñales", destination: "Viñales" },
  { id: 18, name: "Finca Raúl Reyes", destination: "Viñales" },
  { id: 19, name: "Hotel Los Jazmines", destination: "Viñales" },
  { id: 20, name: "Plaza Mayor de Trinidad", destination: "Trinidad" },
  { id: 21, name: "Parque Guanayara", destination: "Trinidad" },
  { id: 22, name: "Valle de los Ingenios", destination: "Trinidad" },
  { id: 23, name: "Casa del Alfarero", destination: "Trinidad" },
  { id: 24, name: "Palacio Brunet", destination: "Trinidad" },
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
];

export function findActivityRecord(id: number) {
  return activities.find(activity => activity.id === id);
}
