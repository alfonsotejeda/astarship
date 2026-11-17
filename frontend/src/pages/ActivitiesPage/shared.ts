import type { Tone } from "@/components/Alert/tones";

export type ToastMessage = { tone: Tone; text: string };

// An activity id, "new" while describing one, or null with the drawer closed
export type Selection = number | "new" | null;

export function usesText(count: number) {
  return count === 1 ? "1 uso" : `${count} usos`;
}
