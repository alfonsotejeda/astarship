import type { Activity as RowActivity } from "@/components/ActivityRow/ActivityRow";
import { toActivityType, toEffortLevel } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import { formatDuration } from "@/lib/format";

export function toRowActivity(activity: Activity, category: string | undefined): RowActivity {
  return {
    id: activity.id,
    name: activity.name,
    attraction: activity.attraction_name ?? undefined,
    author: activity.author_name ?? undefined,
    type: toActivityType(activity.activity_type_code),
    category,
    effort: toEffortLevel(activity.effort_level),
    duration: formatDuration(activity.duration_minutes),
  };
}
