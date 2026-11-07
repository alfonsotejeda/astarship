import type { ActivityType } from "@/components/Badge/Badge";
import type { Proportion } from "@/components/ProportionInput/ProportionInput";
import { toActivityType } from "@/lib/api/activities";
import type { ActivityTypeItem } from "@/lib/api/catalogs";
import type { Package } from "@/lib/api/packages";

const DRAFT_KEY = "astarship.generator-draft";

export const MIN_TOTAL = 4;
export const MAX_TOTAL = 30;

// Starting values of the form; the guide changes them before generating
const DEFAULT_DAYS = 2;
const DEFAULT_TOTAL = 8;
const DEFAULT_PROPORTION: Proportion = { visita: 40, excursion: 35, taller: 25 };

export type TypeOption = { key: ActivityType; code: string; label: string };

export type GeneratorForm = {
  packageId: number;
  days: number;
  total: number;
  proportion: Proportion;
  categoryIds: number[];
  avoidLateEffort: boolean;
  // null until the guide touches the list: the candidates in the package's categories
  candidateIds: number[] | null;
};

export function initialForm(pkg: Package, base?: GeneratorForm): GeneratorForm {
  return {
    packageId: pkg.id,
    days: base?.days ?? DEFAULT_DAYS,
    total: base?.total ?? DEFAULT_TOTAL,
    proportion: base?.proportion ?? DEFAULT_PROPORTION,
    categoryIds: pkg.categories.map(category => category.id),
    avoidLateEffort: base?.avoidLateEffort ?? true,
    candidateIds: null,
  };
}

export type FormValidity = Record<"days" | "total" | "proportion" | "categories", boolean>;

export function validate(form: GeneratorForm, types: TypeOption[]): FormValidity {
  return {
    days: form.days >= 1,
    total: form.total >= MIN_TOTAL && form.total <= MAX_TOTAL,
    proportion: types.reduce((sum, type) => sum + form.proportion[type.key], 0) === 100,
    categories: form.categoryIds.length > 0,
  };
}

export function loadDraft(packages: Package[]): GeneratorForm | null {
  try {
    const draft = JSON.parse(localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<GeneratorForm> | null;
    const pkg = packages.find(item => item.id === draft?.packageId);
    // A draft saved by an older version may lack fields: those take the defaults
    return draft && pkg ? { ...initialForm(pkg), ...draft } : null;
  } catch {
    return null;
  }
}

export function saveDraft(form: GeneratorForm): boolean {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    return true;
  } catch {
    return false;
  }
}

export function toTypeOptions(activityTypes: ActivityTypeItem[]): TypeOption[] {
  return activityTypes.flatMap(item => {
    const key = toActivityType(item.code);
    return key ? [{ key, code: item.code, label: item.name }] : [];
  });
}
