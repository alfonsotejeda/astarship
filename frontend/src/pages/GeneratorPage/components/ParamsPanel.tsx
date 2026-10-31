import { Checkbox } from "@/components/Checkbox/Checkbox";
import { ChipSelect } from "@/components/ChipSelect/ChipSelect";
import { Field } from "@/components/Field/Field";
import { Panel } from "@/components/Panel/Panel";
import { ProportionInput } from "@/components/ProportionInput/ProportionInput";
import type { Activity } from "@/lib/api/activities";
import type { Package } from "@/lib/api/packages";
import { MAX_TOTAL, MIN_TOTAL } from "../lib/form";
import type { FormValidity, GeneratorForm } from "../lib/form";

type ParamsPanelProps = {
  packages: Package[];
  pkg: Package;
  form: GeneratorForm;
  valid: FormValidity;
  candidates: Activity[];
  onChange: (changes: Partial<GeneratorForm>) => void;
  onPackageChange: (id: number) => void;
};

export function ParamsPanel({ packages, pkg, form, valid, candidates, onChange, onPackageChange }: ParamsPanelProps) {
  const categoryOptions = pkg.categories.map(category => ({
    value: String(category.id),
    label: category.name,
    count: candidates.filter(activity => activity.category_id === category.id).length,
  }));

  return (
    <Panel title="Paquete y parámetros" subtitle="Se guardan junto al itinerario generado.">
      <div className="generator__params">
        <Field
          id="generator-package"
          label="Paquete turístico"
          options={packages.map(item => ({ value: String(item.id), label: item.name }))}
          value={String(pkg.id)}
          onChange={event => onPackageChange(Number(event.target.value))}
          hint="Paquetes validados en los que puedes generar."
        />
        <Field
          id="generator-days"
          label="Días"
          type="number"
          min={1}
          suffix="días"
          value={form.days}
          onChange={event => onChange({ days: Number(event.target.value) })}
          error={valid.days ? undefined : "Al menos 1 día."}
        />
        <Field
          id="generator-total"
          label="Total de actividades"
          type="number"
          min={MIN_TOTAL}
          max={MAX_TOTAL}
          value={form.total}
          onChange={event => onChange({ total: Number(event.target.value) })}
          hint={valid.total ? `Entre ${MIN_TOTAL} y ${MAX_TOTAL}.` : undefined}
          error={valid.total ? undefined : `Pon entre ${MIN_TOTAL} y ${MAX_TOTAL}.`}
        />
      </div>

      <ProportionInput
        id="generator-proportion"
        total={form.total}
        value={form.proportion}
        onChange={proportion => onChange({ proportion })}
      />

      <div className="generator__coverage">
        <span className="generator__coverage-label">Cobertura de categorías</span>
        <ChipSelect
          label="Categorías a cubrir"
          options={categoryOptions}
          value={form.categoryIds.map(String)}
          onChange={values => onChange({ categoryIds: values.map(Number) })}
        />
        <span className={valid.categories ? "generator__hint" : "generator__hint generator__hint--bad"}>
          {valid.categories
            ? "Vienen marcadas las categorías del paquete. Cada una debe aparecer al menos una vez."
            : "Marca al menos una categoría."}
        </span>
      </div>

      <Checkbox
        label="Evitar esfuerzo alto al final del día"
        description="Ninguna actividad de esfuerzo alto después de las 17:00."
        checked={form.avoidLateEffort}
        onChange={event => onChange({ avoidLateEffort: event.target.checked })}
      />
    </Panel>
  );
}
