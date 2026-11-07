import type { ActivityTypeItem, Category } from "@/lib/api/catalogs";

export const categories: Category[] = [
  { id: 1, name: "Patrimonio" },
  { id: 2, name: "Gastronomía" },
  { id: 3, name: "Arte" },
  { id: 4, name: "Música" },
  { id: 5, name: "Naturaleza" },
  { id: 6, name: "Artesanía" },
];

export const activityTypes: ActivityTypeItem[] = [
  { code: "visita", name: "Visita" },
  { code: "excursion", name: "Excursión" },
  { code: "taller", name: "Taller" },
];
