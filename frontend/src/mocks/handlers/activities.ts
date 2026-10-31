import { ApiError } from "@/lib/api/client";
import type { Activity } from "@/lib/api/activities";
import { activities, attractions } from "../data/activities";
import type { ActivityRecord } from "../data/activities";
import { packages } from "../data/packages";
import { users } from "../data/users";
import type { MockRoute } from "../types";

export function toActivity({ attraction_id, ...record }: ActivityRecord): Activity {
  return {
    ...record,
    attraction_name: attractions.find(item => item.id === attraction_id)?.name ?? null,
    author_name: users.find(item => item.id === record.user_id)?.name ?? null,
  };
}

// An activity is usable in a package when its attraction is in the package's destination
function inPackage(activity: ActivityRecord, packageId: number) {
  const pkg = packages.find(item => item.id === packageId);
  if (!pkg) throw new ApiError(404, "El paquete no existe.");
  return attractions.find(item => item.id === activity.attraction_id)?.destination === pkg.destination;
}

export const activityRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/activities",
    handler: ({ query }) => {
      const packageId = query.get("package");
      const status = query.get("status");
      return activities
        .filter(item => !packageId || inPackage(item, Number(packageId)))
        .filter(item => !status || item.status === status)
        .map(toActivity);
    },
  },
];
