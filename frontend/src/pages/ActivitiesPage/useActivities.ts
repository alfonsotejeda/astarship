import { useCallback, useState } from "react";
import { mergeActivities, SAMPLE_ACTIVITIES, SAMPLE_DUPLICATES } from "./activityData";
import type { ActivityDraft, BankActivity, DuplicatePair, Side } from "./activityData";

export type ResolvedPair = {
  id: string;
  title: string;
  outcome: "merged" | "dismissed";
  kept?: string;
};

export type MergeResult = { keep: BankActivity; lose: BankActivity };

/**
 * Data and actions for the activity bank.
 *
 * Until the endpoints exist it keeps the artboard sample data in memory. To connect the API, replace the
 * state with react-query calls and keep this return shape, so the page does not change:
 * - `activities`: `GET /activities` (the filters could move to `?type&category&effort&author&q`),
 *   `create` and `update`: `POST` and `PATCH /activities/{id}`.
 * - `pairs`: `GET /activities/duplicates`.
 * - `merge`: `POST /activities/{id}/merge` with `{ into }` (the backend moves the uses, RF-06 / RN-03).
 * - `dismiss`: `POST /activities/duplicates/{pair_id}/dismiss`.
 * The attractions and the type and category catalogues in `activityData.ts` come from `GET /attractions`,
 * `GET /activity-types` and `GET /categories`.
 */
export function useActivities() {
  const [activities, setActivities] = useState<BankActivity[]>(SAMPLE_ACTIVITIES);
  const [pairs, setPairs] = useState<DuplicatePair[]>(SAMPLE_DUPLICATES);
  const [resolved, setResolved] = useState<ResolvedPair[]>([]);

  const create = useCallback(
    (draft: ActivityDraft, author: string) => {
      const nextId = Math.max(0, ...activities.map(item => item.id), ...pairs.flatMap(pair => [pair.a.id, pair.b.id])) + 1;
      setActivities(current => [...current, { ...draft, id: nextId, author, uses: 0 }]);
    },
    [activities, pairs],
  );

  const update = useCallback((id: number, draft: ActivityDraft) => {
    setActivities(current => current.map(item => (item.id === id ? { ...item, ...draft } : item)));
  }, []);

  const merge = useCallback(
    (pairId: string, keepSide: Side): MergeResult | undefined => {
      const pair = pairs.find(item => item.id === pairId);
      if (!pair) return undefined;

      const keep = keepSide === "a" ? pair.a : pair.b;
      const lose = keepSide === "a" ? pair.b : pair.a;
      setActivities(current => mergeActivities(current, keep, lose));
      setPairs(current => current.filter(item => item.id !== pairId));
      setResolved(current => [
        { id: pairId, title: `${pair.a.name} · ${pair.b.name}`, outcome: "merged", kept: keep.name },
        ...current,
      ]);
      return { keep, lose };
    },
    [pairs],
  );

  const dismiss = useCallback(
    (pairId: string) => {
      const pair = pairs.find(item => item.id === pairId);
      if (!pair) return;
      setPairs(current => current.filter(item => item.id !== pairId));
      setResolved(current => [{ id: pairId, title: `${pair.a.name} · ${pair.b.name}`, outcome: "dismissed" }, ...current]);
    },
    [pairs],
  );

  return { activities, pairs, resolved, create, update, merge, dismiss };
}
