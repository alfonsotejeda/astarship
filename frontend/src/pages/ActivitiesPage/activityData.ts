import type { ActivityType } from "@/components/Badge/Badge";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import type { FieldOption } from "@/components/Field/Field";

export type CategoryKey = "patrimonio" | "gastronomia" | "arte" | "musica" | "naturaleza";

export type BankActivity = {
  id: number;
  name: string;
  attractionId: string;
  type: ActivityType;
  category: CategoryKey;
  effort: EffortLevel;
  minutes: number;
  author: string;
  // Times the activity appears in approved itineraries
  uses: number;
  description?: string;
};

// What the "Nueva actividad" panel edits; author and uses are set by the system
export type ActivityDraft = Omit<BankActivity, "id" | "author" | "uses">;

export type DuplicatePair = {
  id: string;
  score: number;
  a: BankActivity;
  b: BankActivity;
};

export type Side = "a" | "b";

/* ---------- Catalogues ---------- */

export const TYPE_LABEL: Record<ActivityType, string> = {
  visita: "Visita",
  excursion: "Excursión",
  taller: "Taller",
};

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  patrimonio: "Patrimonio",
  gastronomia: "Gastronomía",
  arte: "Arte",
  musica: "Música",
  naturaleza: "Naturaleza",
};

export const EFFORT_LABEL: Record<EffortLevel, string> = {
  bajo: "Bajo",
  medio: "Medio",
  alto: "Alto",
};

export const EFFORT_RANK: Record<EffortLevel, number> = { bajo: 1, medio: 2, alto: 3 };

function toOptions<K extends string>(labels: Record<K, string>): { value: K; label: string }[] {
  return (Object.keys(labels) as K[]).map(value => ({ value, label: labels[value] }));
}

export const TYPE_OPTIONS = toOptions(TYPE_LABEL);
export const CATEGORY_OPTIONS = toOptions(CATEGORY_LABEL);
export const EFFORT_OPTIONS = toOptions(EFFORT_LABEL);

export const ATTRACTIONS: { value: string; label: string }[] = [
  { value: "plaza-vieja", label: "Plaza Vieja" },
  { value: "plaza-armas", label: "Plaza de Armas" },
  { value: "morro", label: "Castillo de los Tres Reyes del Morro" },
  { value: "malecon", label: "Malecón" },
  { value: "paladar-patio", label: "Paladar El Patio" },
  { value: "bellas-artes", label: "Edificio de Arte Cubano" },
  { value: "casa-musica", label: "Casa de la Música" },
  { value: "cabana", label: "Fortaleza de La Cabaña" },
  { value: "centro-habana", label: "Centro Habana" },
  { value: "almendares", label: "Bosque de La Habana" },
];

/** Name of an attraction from its id; falls back to the id itself. */
export function attractionLabel(id: string) {
  return ATTRACTIONS.find(item => item.value === id)?.label ?? id;
}

/** Adds the empty "all" option in front of a filter's options. */
export function withAll(options: FieldOption[], allLabel: string): FieldOption[] {
  return [{ value: "", label: allLabel }, ...options];
}

/* ---------- Formatting and text ---------- */

/** Minutes as text: 90 -> "1 h 30 min", 120 -> "2 h". */
export function formatDuration(minutes: number) {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours ? `${hours} h` : "", rest ? `${rest} min` : ""].filter(Boolean).join(" ");
}

/** Lowercase, no accents, no punctuation: for searching and comparing names. */
export function normalize(text: string) {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const STOPWORDS = new Set(["de", "del", "la", "las", "el", "los", "un", "una", "y", "en", "a", "al", "por", "con"]);

function tokens(text: string) {
  return normalize(text)
    .split(" ")
    .filter(token => token && !STOPWORDS.has(token));
}

function nameSimilarity(a: string, b: string) {
  const left = new Set(tokens(a));
  const right = new Set(tokens(b));
  if (!left.size || !right.size) return 0;
  let shared = 0;
  left.forEach(token => {
    if (right.has(token)) shared += 1;
  });
  return shared / (left.size + right.size - shared);
}

/* ---------- Duplicates ---------- */

/**
 * Activity most likely to duplicate the one being written, if any.
 *
 * Provisional client-side check for the warning in the "Nueva actividad" panel: same attraction and
 * either the same type or a similar name. The real similarity score comes from the duplicates
 * endpoint; this only has to be good enough to warn before saving. It never blocks saving.
 *
 * @param ignoreId an activity to skip (the one being edited)
 */
export function findPossibleDuplicate(
  draft: Pick<ActivityDraft, "name" | "attractionId" | "type">,
  activities: BankActivity[],
  ignoreId?: number,
): BankActivity | undefined {
  if (normalize(draft.name).length < 3) return undefined;

  let best: BankActivity | undefined;
  let bestScore = -1;
  for (const activity of activities) {
    if (activity.id === ignoreId || activity.attractionId !== draft.attractionId) continue;
    const score = nameSimilarity(draft.name, activity.name);
    if (activity.type !== draft.type && score < 0.5) continue;
    if (score > bestScore) {
      best = activity;
      bestScore = score;
    }
  }
  return best;
}

/**
 * RF-06 / RN-03: merging keeps one activity and moves the uses of the other to it, so the itineraries
 * that used the deleted one now point at the one that stays. Returns the new list; `activities` is not changed.
 */
export function mergeActivities(activities: BankActivity[], keep: BankActivity, lose: BankActivity): BankActivity[] {
  const moved = activities.find(item => item.id === lose.id)?.uses ?? lose.uses;
  const withoutLost = activities.filter(item => item.id !== lose.id);

  if (!withoutLost.some(item => item.id === keep.id)) {
    return [...withoutLost, { ...keep, uses: keep.uses + moved }];
  }
  return withoutLost.map(item => (item.id === keep.id ? { ...item, uses: item.uses + moved } : item));
}

/* ---------- Sample data (artboards P-02 and P-21) ---------- */

export const SAMPLE_ACTIVITIES: BankActivity[] = [
  { id: 1, name: "Castillo de la Real Fuerza", attractionId: "plaza-armas", type: "visita", category: "patrimonio", effort: "bajo", minutes: 60, author: "Laura Pérez", uses: 14 },
  { id: 2, name: "Ruta a pie por la Habana Vieja", attractionId: "plaza-vieja", type: "excursion", category: "patrimonio", effort: "medio", minutes: 120, author: "Ernesto Díaz", uses: 12 },
  { id: 3, name: "Taller de cocina criolla", attractionId: "paladar-patio", type: "taller", category: "gastronomia", effort: "bajo", minutes: 90, author: "Yanet Rodríguez", uses: 11 },
  { id: 4, name: "Subida al Morro", attractionId: "morro", type: "excursion", category: "patrimonio", effort: "alto", minutes: 120, author: "Ernesto Díaz", uses: 9 },
  { id: 5, name: "Museo Nacional de Bellas Artes", attractionId: "bellas-artes", type: "visita", category: "arte", effort: "bajo", minutes: 90, author: "Laura Pérez", uses: 8 },
  { id: 6, name: "Clase de son cubano", attractionId: "casa-musica", type: "taller", category: "musica", effort: "medio", minutes: 90, author: "Yanet Rodríguez", uses: 7 },
  { id: 7, name: "Cañonazo de las nueve", attractionId: "cabana", type: "visita", category: "patrimonio", effort: "medio", minutes: 90, author: "Laura Pérez", uses: 7 },
  { id: 8, name: "Paseo en bici por el Malecón", attractionId: "malecon", type: "excursion", category: "naturaleza", effort: "medio", minutes: 120, author: "Ernesto Díaz", uses: 5 },
  { id: 9, name: "Callejón de Hamel", attractionId: "centro-habana", type: "visita", category: "arte", effort: "bajo", minutes: 60, author: "Laura Pérez", uses: 4 },
  { id: 10, name: "Senderismo en el Parque Almendares", attractionId: "almendares", type: "excursion", category: "naturaleza", effort: "alto", minutes: 150, author: "Ernesto Díaz", uses: 2 },
];

const bankById = (id: number) => SAMPLE_ACTIVITIES.find(item => item.id === id) as BankActivity;

export const SAMPLE_DUPLICATES: DuplicatePair[] = [
  {
    id: "p1",
    score: 92,
    a: bankById(2),
    b: { id: 11, name: "Recorrido por la Plaza Vieja", attractionId: "plaza-vieja", type: "excursion", category: "patrimonio", effort: "medio", minutes: 90, author: "Yanet Rodríguez", uses: 1 },
  },
  {
    id: "p2",
    score: 87,
    a: bankById(6),
    b: { id: 12, name: "Taller de son en la Casa de la Música", attractionId: "casa-musica", type: "taller", category: "musica", effort: "bajo", minutes: 90, author: "Laura Pérez", uses: 0 },
  },
];

// The artboard shows 14 duplicates already resolved before this session
export const SAMPLE_RESOLVED_BEFORE = 14;
