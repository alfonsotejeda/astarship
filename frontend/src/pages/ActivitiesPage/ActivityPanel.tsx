import { useMemo, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { Alert } from "@/components/Alert/Alert";
import type { ActivityType } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import type { EffortLevel } from "@/components/EffortMeter/EffortMeter";
import { Field } from "@/components/Field/Field";
import { Panel } from "@/components/Panel/Panel";
import { ATTRACTIONS, CATEGORY_OPTIONS, EFFORT_OPTIONS, TYPE_OPTIONS, findPossibleDuplicate } from "./activityData";
import type { ActivityDraft, BankActivity, CategoryKey } from "./activityData";

type ActivityPanelProps = {
  // Without `activity` the panel creates; with it, it edits
  activity?: BankActivity;
  activities: BankActivity[];
  onSave: (draft: ActivityDraft) => void;
  onClose: () => void;
};

type Errors = Partial<Record<"name" | "minutes", string>>;

/**
 * Side panel to create an activity, or to edit one when `activity` is given.
 * Warns about a possible duplicate while the name, attraction or type change; the warning never blocks saving.
 */
export function ActivityPanel({ activity, activities, onSave, onClose }: ActivityPanelProps) {
  const isEdit = activity !== undefined;
  const title = isEdit ? "Editar actividad" : "Nueva actividad";

  const [name, setName] = useState(activity?.name ?? "");
  const [attractionId, setAttractionId] = useState(activity?.attractionId ?? ATTRACTIONS[0].value);
  const [type, setType] = useState<ActivityType>(activity?.type ?? "excursion");
  const [category, setCategory] = useState<CategoryKey>(activity?.category ?? "patrimonio");
  const [effort, setEffort] = useState<EffortLevel>(activity?.effort ?? "medio");
  const [minutes, setMinutes] = useState(String(activity?.minutes ?? 90));
  const [description, setDescription] = useState(activity?.description ?? "");
  const [errors, setErrors] = useState<Errors>({});

  const duplicate = useMemo(
    () => findPossibleDuplicate({ name, attractionId, type }, activities, activity?.id),
    [name, attractionId, type, activities, activity?.id],
  );

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const duration = Number(minutes);
    const next: Errors = {};
    if (!name.trim()) next.name = "Escribe el nombre de la actividad.";
    if (!Number.isInteger(duration) || duration <= 0) next.minutes = "Indica la duración en minutos.";
    setErrors(next);
    if (Object.keys(next).length) return;

    onSave({
      name: name.trim(),
      attractionId,
      type,
      category,
      effort,
      minutes: duration,
      description: description.trim() || undefined,
    });
  }

  function handleKeyDown(event: KeyboardEvent) {
    if (event.key === "Escape") onClose();
  }

  return (
    <form className="activity-form" noValidate onSubmit={handleSubmit} onKeyDown={handleKeyDown}>
      <Panel
        title={title}
        actions={<Button variant="ghost" size="sm" icon="x" aria-label="Cerrar" onClick={onClose} />}
        footer={
          <div className="activity-form__footer">
            <Button variant="ghost" onClick={onClose}>
              Cancelar
            </Button>
            <Button variant="primary" type="submit">
              {isEdit ? "Guardar cambios" : "Guardar actividad"}
            </Button>
          </div>
        }
      >
        <Field
          id="activity-name"
          label="Nombre"
          required
          autoFocus
          value={name}
          error={errors.name}
          onChange={event => setName(event.target.value)}
        />

        {duplicate && (
          <Alert tone="warn" title="Posible duplicado">
            Ya existe «{duplicate.name}» en la misma atracción, de {duplicate.author}. Revísala antes de guardar.
          </Alert>
        )}

        <Field
          id="activity-attraction"
          label="Atracción"
          options={ATTRACTIONS}
          value={attractionId}
          hint="La atracción fija la ubicación en la red de conexiones."
          onChange={event => setAttractionId(event.target.value)}
        />

        <div className="activity-form__grid">
          <Field
            id="activity-type"
            label="Tipo"
            options={TYPE_OPTIONS}
            value={type}
            onChange={event => setType(event.target.value as ActivityType)}
          />
          <Field
            id="activity-category"
            label="Categoría"
            options={CATEGORY_OPTIONS}
            value={category}
            onChange={event => setCategory(event.target.value as CategoryKey)}
          />
          <Field
            id="activity-effort"
            label="Esfuerzo físico"
            options={EFFORT_OPTIONS}
            value={effort}
            onChange={event => setEffort(event.target.value as EffortLevel)}
          />
          <Field
            id="activity-minutes"
            label="Duración"
            type="number"
            min={5}
            step={5}
            inputMode="numeric"
            suffix="min"
            value={minutes}
            error={errors.minutes}
            onChange={event => setMinutes(event.target.value)}
          />
        </div>

        <Field
          id="activity-description"
          label="Descripción"
          multiline
          placeholder="Qué se hace, punto de encuentro, qué llevar"
          value={description}
          onChange={event => setDescription(event.target.value)}
        />
      </Panel>
    </form>
  );
}
