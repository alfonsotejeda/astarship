import { ApiError } from "@/lib/api/client";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import type { Rc4ChartPoint, Rc4Group, Rc4Itinerary, Rc4Report, Rc4Row, Rc4Summary } from "@/lib/api/reports";
import { findActivityRecord } from "../data/activities";
import type { ActivityRecord } from "../data/activities";
import { assignments, visits } from "../data/assignments";
import type { AssignmentRecord } from "../data/assignments";
import { memberships, travelGroups } from "../data/groups";
import { itineraries } from "../data/itineraries";
import type { ItineraryRecord } from "../data/itineraries";
import { findPackage } from "../data/packages";
import { findUser } from "../data/users";
import type { MockRoute } from "../types";

// Mock for GET /reports/rc4 until backend #58 exists. It reuses the demo visits.
const EFFORT_LEVELS: EffortLevel[] = ["bajo", "medio", "alto"];
const EFFORT_ORDER: Record<EffortLevel, number> = { bajo: 1, medio: 2, alto: 3 };
const EFFORT_LABEL: Record<EffortLevel, string> = { bajo: "Bajo", medio: "Medio", alto: "Alto" };

// Same as the backend: every role but the tourist
function checkCanReport(userId: number) {
  if (findUser(userId)?.role === "tourist") throw new ApiError(403, "Los turistas no tienen acceso a los reportes.");
}

function effortBand(level: number): EffortLevel {
  if (level <= 1) return "bajo";
  if (level === 2) return "medio";
  return "alto";
}

// A tourist may belong to several groups; only those of the itinerary's package apply
function groupIdsFor(userId: number, packageId: number) {
  return memberships
    .filter(item => item.tourist_id === userId)
    .flatMap(item => {
      const group = travelGroups.find(record => record.id === item.travel_group_id);
      return group && group.package_id === packageId ? [group.id] : [];
    });
}

type Experience = {
  assignment: AssignmentRecord;
  itinerary: ItineraryRecord;
  groupIds: number[];
};

function allExperiences(): Experience[] {
  return assignments.flatMap(assignment => {
    const itinerary = itineraries.find(item => item.id === assignment.itinerary_id);
    if (!itinerary) return [];
    return [{ assignment, itinerary, groupIds: groupIdsFor(assignment.user_id, itinerary.package_id) }];
  });
}

function itineraryOptions(): Rc4Itinerary[] {
  const ids = new Set(visits.map(visit => visit.itinerary_id));
  return [...ids]
    .flatMap((id): Rc4Itinerary[] => {
      const itinerary = itineraries.find(item => item.id === id);
      if (!itinerary) return [];
      return [{ id, package_name: findPackage(itinerary.package_id)?.name ?? "" }];
    })
    .sort((a, b) => b.id - a.id);
}

function groupOptions(experiences: Experience[]): Rc4Group[] {
  const ids = new Set(experiences.flatMap(experience => experience.groupIds));
  return travelGroups
    .filter(group => ids.has(group.id))
    .map(group => ({ id: group.id, name: group.name }))
    .sort((a, b) => a.name.localeCompare(b.name, "es"));
}

type ActivityAccumulator = {
  activity: ActivityRecord;
  visits: number;
  completed: number;
  skipped: number;
  rated: number;
  satisfied: number;
  ratingSum: number;
};

function emptyAccumulator(activity: ActivityRecord): ActivityAccumulator {
  return { activity, visits: 0, completed: 0, skipped: 0, rated: 0, satisfied: 0, ratingSum: 0 };
}

function total(accumulators: ActivityAccumulator[]) {
  return accumulators.reduce(
    (sum, item) => ({
      visits: sum.visits + item.visits,
      completed: sum.completed + item.completed,
      skipped: sum.skipped + item.skipped,
      rated: sum.rated + item.rated,
      satisfied: sum.satisfied + item.satisfied,
      ratingSum: sum.ratingSum + item.ratingSum,
    }),
    { visits: 0, completed: 0, skipped: 0, rated: 0, satisfied: 0, ratingSum: 0 },
  );
}

function percent(part: number, whole: number) {
  return whole > 0 ? (part / whole) * 100 : 0;
}

function rc4Report(query: URLSearchParams): Rc4Report {
  const itineraryId = query.get("itinerary_id");
  const groupId = query.get("group_id");
  const experiences = allExperiences();
  const visible = experiences.filter(
    experience =>
      (!itineraryId || experience.itinerary.id === Number(itineraryId)) &&
      (!groupId || experience.groupIds.includes(Number(groupId))),
  );

  const tourists = new Set<number>();
  const byActivity = new Map<number, ActivityAccumulator>();

  for (const experience of visible) {
    const ownVisits = visits.filter(
      visit =>
        visit.itinerary_id === experience.itinerary.id && visit.user_id === experience.assignment.user_id,
    );
    if (ownVisits.length > 0) tourists.add(experience.assignment.user_id);

    for (const visit of ownVisits) {
      const activity = findActivityRecord(visit.activity_id);
      if (!activity) continue;

      const accumulator = byActivity.get(activity.id) ?? emptyAccumulator(activity);
      accumulator.visits += 1;

      if (visit.status === "done") {
        accumulator.completed += 1;
        if (visit.rating !== null) {
          accumulator.rated += 1;
          accumulator.ratingSum += visit.rating;
          if (visit.rating >= 4) accumulator.satisfied += 1;
        }
      } else {
        accumulator.skipped += 1;
      }

      byActivity.set(activity.id, accumulator);
    }
  }

  const accumulators = [...byActivity.values()];
  const rows = accumulators
    .map(
      (item): Rc4Row => ({
        id: item.activity.id,
        activity_name: item.activity.name,
        effort: effortBand(item.activity.effort_level),
        visits: item.visits,
        completed: item.completed,
        rating: item.rated > 0 ? item.ratingSum / item.rated : null,
        satisfaction: percent(item.satisfied, item.visits),
        abandonment: percent(item.skipped, item.visits),
      }),
    )
    .sort(
      (a, b) =>
        EFFORT_ORDER[a.effort] - EFFORT_ORDER[b.effort] ||
        b.visits - a.visits ||
        a.activity_name.localeCompare(b.activity_name, "es"),
    );

  const chart = EFFORT_LEVELS.map((effort): Rc4ChartPoint => {
    const totals = total(accumulators.filter(item => effortBand(item.activity.effort_level) === effort));
    return {
      effort,
      label: EFFORT_LABEL[effort],
      satisfaction: percent(totals.satisfied, totals.visits),
      abandonment: percent(totals.skipped, totals.visits),
    };
  });

  const totals = total(accumulators);
  const summary: Rc4Summary = {
    visits: totals.visits,
    completed: totals.completed,
    skipped: totals.skipped,
    rated: totals.rated,
    tourists: tourists.size,
    rating: totals.rated > 0 ? totals.ratingSum / totals.rated : null,
    satisfaction: percent(totals.satisfied, totals.visits),
    abandonment: percent(totals.skipped, totals.visits),
  };

  return {
    rows,
    chart,
    summary,
    itineraries: itineraryOptions(),
    groups: groupOptions(experiences),
  };
}

export const reportRoutes: MockRoute[] = [
  {
    method: "GET",
    path: "/reports/rc4",
    handler: ({ userId, query }) => {
      checkCanReport(userId);
      return rc4Report(query);
    },
  },
];
