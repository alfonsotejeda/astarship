import type { Activity as RowActivity } from "@/components/ActivityRow/ActivityRow";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import type { Status } from "@/components/StatusPill/StatusPill";
import { toActivityType, toEffortLevel } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import type { ReviewStatus } from "@/lib/api/packages";
import { formatDuration } from "@/lib/format";

export const TYPE_OPTIONS = [
  { value: "visita", label: "Visita" },
  { value: "excursion", label: "Excursión" },
  { value: "taller", label: "Taller" },
];

// Same scale as the API: 1 low, 2 medium, 3 high
export const EFFORT_OPTIONS = [
  { value: "1", label: "Bajo" },
  { value: "2", label: "Medio" },
  { value: "3", label: "Alto" },
];

export const EFFORT_LABEL: Record<EffortLevel, string> = { bajo: "Bajo", medio: "Medio", alto: "Alto" };

export function typeLabel(code: string | null) {
  return TYPE_OPTIONS.find(option => option.value === code)?.label ?? "";
}

export function effortLabel(level: number) {
  return EFFORT_LABEL[toEffortLevel(level)];
}

export function toRowActivity(activity: Activity, category: string | undefined): RowActivity {
  return {
    id: activity.id,
    name: activity.name,
    attraction: activity.attraction_name ?? undefined,
    attractionTo: activity.attraction_id !== null ? `/attractions/${activity.attraction_id}` : undefined,
    author: activity.author_name ?? undefined,
    type: toActivityType(activity.activity_type_code),
    category,
    effort: toEffortLevel(activity.effort_level),
    duration: formatDuration(activity.duration_minutes),
  };
}

export const ACTIVITY_STATUS_PILL: Record<ReviewStatus, { status: Status; label: string }> = {
  approved: { status: "aprobado", label: "Validada" },
  pending: { status: "pendiente", label: "Pendiente" },
  rejected: { status: "rechazado", label: "Rechazada" },
};

const STOP_WORDS = new Set(["a", "al", "de", "del", "el", "en", "la", "las", "los", "por", "para", "con", "y", "un", "una"]);

// Lowercase, without accents, punctuation or filler words
function words(name: string) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(word => word && !STOP_WORDS.has(word));
}

function bigrams(name: string) {
  const counts = new Map<string, number>();
  for (const word of words(name)) {
    for (let index = 0; index < word.length - 1; index++) {
      const pair = word.slice(index, index + 2);
      counts.set(pair, (counts.get(pair) ?? 0) + 1);
    }
  }
  return counts;
}

// 0–100, Dice coefficient over letter pairs
export function nameSimilarity(a: string, b: string) {
  const first = bigrams(a);
  const second = bigrams(b);
  let shared = 0;
  let total = 0;
  for (const [pair, count] of first) {
    shared += Math.min(count, second.get(pair) ?? 0);
    total += count;
  }
  for (const count of second.values()) total += count;
  return total === 0 ? 0 : Math.round((200 * shared) / total);
}

// RF-06: same attraction and a name that shares a meaningful word
export function isPossibleDuplicate(
  a: { name: string; attraction_id: number | null },
  b: { name: string; attraction_id: number | null },
) {
  if (a.attraction_id === null || a.attraction_id !== b.attraction_id) return false;
  const other = new Set(words(b.name));
  return words(a.name).some(word => other.has(word));
}
