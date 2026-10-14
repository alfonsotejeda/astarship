import type { IconName } from "@/components/Icon/icons";

export type Tone = "info" | "warn" | "bad" | "ok";

export const TONE_ICONS: Record<Tone, IconName> = {
  info: "info",
  warn: "alert",
  bad: "alert",
  ok: "check-circle",
};
