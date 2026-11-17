import { useState } from "react";
import { Link } from "react-router";
import type { User } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import { AttractionFields } from "@/components/AttractionFields/AttractionFields";
import { Button } from "@/components/Button/Button";
import { Dialog } from "@/components/Dialog/Dialog";
import { Drawer } from "@/components/Drawer/Drawer";
import { Field } from "@/components/Field/Field";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { ACTIVITY_STATUS_PILL, EFFORT_OPTIONS, isPossibleDuplicate, TYPE_OPTIONS } from "@/lib/activity";
import type { Activity, ActivityForm, ActivityValidationResult } from "@/lib/api/activities";
import { useSaveAttraction } from "@/lib/api/attractions";
import type { Attraction } from "@/lib/api/attractions";
import type { Category } from "@/lib/api/catalogs";
import { attractionPoint, EMPTY_DRAFT, toForm } from "@/lib/attraction";
import { formatDate } from "@/lib/format";
import { usesText } from "./shared";

type ActivityDrawerProps = {
  // Null while describing a new activity
  activity: Activity | null;
  activities: Activity[];
  categories: Category[];
  attractions: Attraction[];
  user: User;
  hasPendingPair: boolean;
  isSaving: boolean;
  isValidating: boolean;
  onSave: (form: ActivityForm) => void;
  onValidate: (result: ActivityValidationResult, observations: string) => void;
  onShowDuplicates: () => void;
  onClose: () => void;
};

function validationText(activity: Activity) {
  const validation = activity.last_validation;

  if (activity.status === "approved") {
    return validation
      ? `Validada por ${validation.reviewer_name} el ${formatDate(validation.validation_date)}.`
      : "Validada.";
  }
  if (activity.status === "rejected" && validation) {
    return `Rechazada por ${validation.reviewer_name} el ${formatDate(validation.validation_date)}: ${validation.observations}`;
  }
  return `Descrita el ${formatDate(activity.creation_date)}. Pendiente de que la valide el administrador; mientras, no se usa en el generador.`;
}

export function ActivityDrawer({
  activity,
  activities,
  categories,
  attractions,
  user,
  hasPendingPair,
  isSaving,
  isValidating,
  onSave,
  onValidate,
  onShowDuplicates,
  onClose,
}: ActivityDrawerProps) {
  const [name, setName] = useState(activity?.name ?? "");
  const [attractionId, setAttractionId] = useState(String(activity?.attraction_id ?? attractions[0]?.id ?? ""));
  const [typeCode, setTypeCode] = useState(activity?.activity_type_code ?? TYPE_OPTIONS[0].value);
  const [categoryId, setCategoryId] = useState(String(activity?.category_id ?? categories[0]?.id ?? ""));
  const [effort, setEffort] = useState(String(activity?.effort_level ?? 1));
  const [duration, setDuration] = useState(String(activity?.duration_minutes ?? 60));
  const [showErrors, setShowErrors] = useState(false);
  const [observations, setObservations] = useState("");
  const [observationsError, setObservationsError] = useState<string>();
  const [isAddingAttraction, setIsAddingAttraction] = useState(false);

  const isNew = activity === null;
  const isAdmin = user.role === "admin";
  // RN-01
  const canEdit = isNew || (!isAdmin && activity.user_id === user.id);
  const canValidate = isAdmin && activity?.status === "pending";
  const minutes = Number(duration);
  const durationError = !Number.isInteger(minutes) || minutes <= 0 ? "Escribe la duración en minutos." : undefined;

  // RF-06: warns before saving, against what is already loaded
  const similar =
    canEdit && name.trim()
      ? activities.find(
          other =>
            other.id !== activity?.id &&
            isPossibleDuplicate({ name, attraction_id: Number(attractionId) }, other),
        )
      : undefined;

  function save() {
    if (!name.trim() || durationError || !attractionId) {
      setShowErrors(true);
      return;
    }
    onSave({
      name: name.trim(),
      attraction_id: Number(attractionId),
      activity_type_code: typeCode,
      category_id: Number(categoryId),
      effort_level: Number(effort),
      duration_minutes: minutes,
    });
  }

  function reject() {
    if (!observations.trim()) {
      setObservationsError("Escribe por qué la rechazas.");
      return;
    }
    onValidate("rejected", observations.trim());
  }

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        {canEdit ? "Cancelar" : "Cerrar"}
      </Button>
      {canValidate && (
        <>
          <Button variant="danger" disabled={isValidating} onClick={reject}>
            Rechazar
          </Button>
          <Button
            variant="primary"
            icon="check"
            disabled={isValidating}
            onClick={() => onValidate("approved", observations.trim())}
          >
            Validar actividad
          </Button>
        </>
      )}
      {canEdit && (
        <Button variant="primary" disabled={isSaving} onClick={save}>
          Guardar actividad
        </Button>
      )}
    </>
  );

  const pill = activity && ACTIVITY_STATUS_PILL[activity.status];

  return (
    <Drawer
      title={activity?.name ?? "Nueva actividad"}
      meta={pill && <StatusPill status={pill.status}>{pill.label}</StatusPill>}
      footer={footer}
      onClose={onClose}
    >
      {!canEdit && !isAdmin && (
        <Alert tone="info">Solo lectura: solo puede editarla quien la describió, {activity?.author_name}.</Alert>
      )}
      {isNew && (
        <Alert tone="info">
          La actividad quedará pendiente hasta que la valide el administrador. Mientras, no se usa en el generador.
        </Alert>
      )}

      <Field
        id="activity-name"
        label="Nombre"
        required
        value={name}
        disabled={!canEdit}
        error={showErrors && !name.trim() ? "Escribe el nombre de la actividad." : undefined}
        onChange={event => setName(event.target.value)}
      />

      {similar && (
        <Alert tone="warn" title="Posible duplicado">
          Ya existe «{similar.name}» en la misma atracción,{" "}
          {similar.user_id === user.id ? "descrita por ti" : `de ${similar.author_name}`}. Revísala antes de guardar.
        </Alert>
      )}

      <div className="activities__attraction">
        <Field
          id="activity-attraction"
          label="Atracción"
          options={
            attractions.length > 0
              ? attractions.map(item => ({ value: String(item.id), label: item.name }))
              : [{ value: "", label: "Todavía no hay atracciones" }]
          }
          value={attractionId}
          disabled={!canEdit || attractions.length === 0}
          error={showErrors && !attractionId ? "Elige la atracción donde se hace." : undefined}
          hint={canEdit ? "La atracción fija la ubicación en la red de conexiones." : undefined}
          onChange={event => setAttractionId(event.target.value)}
        />
        <div className="activities__attraction-actions">
          {attractionId && (
            <Link to={`/attractions/${attractionId}`} className="activities__attraction-link">
              Ver atracción
            </Link>
          )}
          {/* RF-01: the guide registers a missing attraction without leaving the form */}
          {canEdit && !isAdmin && (
            <Button variant="ghost" size="sm" icon="plus" onClick={() => setIsAddingAttraction(true)}>
              Nueva atracción
            </Button>
          )}
        </div>
      </div>

      <div className="activities__form-grid">
        <Field
          id="activity-type"
          label="Tipo"
          options={TYPE_OPTIONS}
          value={typeCode}
          disabled={!canEdit}
          onChange={event => setTypeCode(event.target.value)}
        />
        <Field
          id="activity-category"
          label="Categoría"
          options={categories.map(category => ({ value: String(category.id), label: category.name }))}
          value={categoryId}
          disabled={!canEdit}
          onChange={event => setCategoryId(event.target.value)}
        />
        <Field
          id="activity-effort"
          label="Esfuerzo físico"
          options={EFFORT_OPTIONS}
          value={effort}
          disabled={!canEdit}
          onChange={event => setEffort(event.target.value)}
        />
        <Field
          id="activity-duration"
          label="Duración"
          type="number"
          min={5}
          step={5}
          suffix="min"
          value={duration}
          disabled={!canEdit}
          error={showErrors ? durationError : undefined}
          onChange={event => setDuration(event.target.value)}
        />
      </div>

      {activity && (
        <div className="activities__validation">
          <div className="activities__validation-head">
            <span className="activities__eyebrow">Validación del administrador</span>
            {activity.uses > 0 && <span className="activities__muted">{usesText(activity.uses)}</span>}
          </div>
          <span className="activities__muted">{validationText(activity)}</span>
          {activity.status === "rejected" && canEdit && (
            <span className="activities__muted">Corrígela y guárdala para que vuelva a revisión.</span>
          )}
        </div>
      )}

      {canValidate && (
        <>
          {hasPendingPair && (
            <Alert
              tone="warn"
              title="Tiene un posible duplicado"
              action={
                <Button size="sm" onClick={onShowDuplicates}>
                  Ver duplicados
                </Button>
              }
            >
              Revísalo antes de validarla: si es la misma actividad, fusiónalas.
            </Alert>
          )}
          <Field
            id="activity-observations"
            label="Observaciones"
            multiline
            placeholder="Obligatorias si la rechazas"
            value={observations}
            error={observationsError}
            onChange={event => {
              setObservations(event.target.value);
              setObservationsError(undefined);
            }}
          />
        </>
      )}

      {isAddingAttraction && (
        <NewAttractionDialog
          attractions={attractions}
          onCreated={created => {
            setAttractionId(String(created.id));
            setIsAddingAttraction(false);
          }}
          onClose={() => setIsAddingAttraction(false)}
        />
      )}
    </Drawer>
  );
}

type NewAttractionDialogProps = {
  attractions: Attraction[];
  onCreated: (attraction: Attraction) => void;
  onClose: () => void;
};

function NewAttractionDialog({ attractions, onCreated, onClose }: NewAttractionDialogProps) {
  const saveAttraction = useSaveAttraction();
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [showErrors, setShowErrors] = useState(false);

  function save() {
    const form = toForm(draft);
    if (!form) {
      setShowErrors(true);
      return;
    }
    saveAttraction.mutate({ id: null, form }, { onSuccess: onCreated });
  }

  return (
    <Dialog
      open
      size="lg"
      title="Nueva atracción"
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={saveAttraction.isPending} onClick={save}>
            {saveAttraction.isPending ? "Guardando…" : "Crear atracción"}
          </Button>
        </>
      }
    >
      {saveAttraction.isError && (
        <Alert tone="bad" title="No se pudo crear la atracción">
          {saveAttraction.error.message}
        </Alert>
      )}
      <AttractionFields
        idPrefix="new-attraction"
        value={draft}
        onChange={setDraft}
        showErrors={showErrors}
        // Only for reference: leaving the dialog would lose the activity being described
        nearby={attractions.map(item => ({ ...attractionPoint(item), to: undefined }))}
      />
    </Dialog>
  );
}
