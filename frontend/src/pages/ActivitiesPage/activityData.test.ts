import { describe, expect, it } from "vitest";
import {
  SAMPLE_ACTIVITIES,
  SAMPLE_DUPLICATES,
  findPossibleDuplicate,
  formatDuration,
  mergeActivities,
  normalize,
} from "./activityData";

const [pairOne, pairTwo] = SAMPLE_DUPLICATES;
const totalUses = (list: typeof SAMPLE_ACTIVITIES) => list.reduce((sum, item) => sum + item.uses, 0);

describe("formatDuration", () => {
  it("writes hours and minutes", () => {
    expect(formatDuration(90)).toBe("1 h 30 min");
    expect(formatDuration(120)).toBe("2 h");
    expect(formatDuration(45)).toBe("45 min");
  });
});

describe("normalize", () => {
  it("ignores case, accents and punctuation", () => {
    expect(normalize("  Cañonazo, de las NUEVE! ")).toBe("canonazo de las nueve");
  });
});

describe("findPossibleDuplicate", () => {
  const draft = { name: "Recorrido por la Plaza Vieja", attractionId: "plaza-vieja", type: "excursion" } as const;

  it("warns about an activity of the same attraction and type", () => {
    expect(findPossibleDuplicate(draft, SAMPLE_ACTIVITIES)?.name).toBe("Ruta a pie por la Habana Vieja");
  });

  it("does not warn when the type differs and the names are not alike", () => {
    expect(findPossibleDuplicate({ ...draft, name: "Cata de ron", type: "taller" }, SAMPLE_ACTIVITIES)).toBeUndefined();
  });

  it("warns about a similar name even if the type differs", () => {
    const result = findPossibleDuplicate(
      { name: "Ruta a pie por la Habana Vieja", attractionId: "plaza-vieja", type: "taller" },
      SAMPLE_ACTIVITIES,
    );
    expect(result?.id).toBe(2);
  });

  it("does not warn in another attraction without a similar name", () => {
    expect(findPossibleDuplicate({ ...draft, attractionId: "malecon", type: "visita" }, SAMPLE_ACTIVITIES)).toBeUndefined();
  });

  it("does not warn with an empty name", () => {
    expect(findPossibleDuplicate({ ...draft, name: "  " }, SAMPLE_ACTIVITIES)).toBeUndefined();
  });

  it("ignores the activity being edited", () => {
    const own = { name: "Ruta a pie por la Habana Vieja", attractionId: "plaza-vieja", type: "excursion" } as const;
    expect(findPossibleDuplicate(own, SAMPLE_ACTIVITIES, 2)).toBeUndefined();
  });
});

describe("mergeActivities (RF-06, RN-03)", () => {
  it("moves the uses of the deleted activity to the one that stays", () => {
    const merged = mergeActivities(SAMPLE_ACTIVITIES, pairOne.a, pairOne.b);
    expect(merged.find(item => item.id === pairOne.a.id)?.uses).toBe(pairOne.a.uses + pairOne.b.uses);
    expect(merged.some(item => item.id === pairOne.b.id)).toBe(false);
  });

  it("adds the kept activity to the list when it was not there, without losing uses", () => {
    const merged = mergeActivities(SAMPLE_ACTIVITIES, pairOne.b, pairOne.a);
    expect(merged.some(item => item.id === pairOne.a.id)).toBe(false);
    expect(merged.find(item => item.id === pairOne.b.id)?.uses).toBe(pairOne.a.uses + pairOne.b.uses);
  });

  it("keeps the total of uses", () => {
    const merged = mergeActivities(SAMPLE_ACTIVITIES, pairOne.a, pairOne.b);
    expect(totalUses(merged)).toBe(totalUses(SAMPLE_ACTIVITIES) + pairOne.b.uses);
  });

  it("does not change the original list", () => {
    const before = JSON.stringify(SAMPLE_ACTIVITIES);
    mergeActivities(SAMPLE_ACTIVITIES, pairTwo.a, pairTwo.b);
    expect(JSON.stringify(SAMPLE_ACTIVITIES)).toBe(before);
  });
});
