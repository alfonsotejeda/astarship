import { useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useSearchParams } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import type { User } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import type { Tone } from "@/components/Alert/tones";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { Drawer } from "@/components/Drawer/Drawer";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import { ACTIVITY_STATUS_PILL, isPossibleDuplicate } from "@/lib/activity";
import {
  toActivityType,
  toEffortLevel,
  useActivities,
  useDismissDuplicate,
  useDuplicates,
  useMergeActivity,
  useSaveActivity,
  useValidateActivity,
} from "@/lib/api/activities";
import type { Activity, ActivityForm, ActivityValidationResult, DuplicatePair } from "@/lib/api/activities";
import { useAttractions, useCategories } from "@/lib/api/catalogs";
import type { Attraction, Category } from "@/lib/api/catalogs";
import { formatDate, formatDuration } from "@/lib/format";
import "./ActivitiesPage.css";

type Tab = "actividades" | "duplicados";

type ToastMessage = { tone: Tone; text: string };

// An activity id, "new" while describing one, or null with the drawer closed
type Selection = number | "new" | null;

const TYPE_OPTIONS = [
  { value: "visita", label: "Visita" },
  { value: "excursion", label: "Excursión" },
  { value: "taller", label: "Taller" },
];

const EFFORT_OPTIONS = [
  { value: "1", label: "Bajo" },
  { value: "2", label: "Medio" },
  { value: "3", label: "Alto" },
];

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Validadas" },
  { value: "rejected", label: "Rechazadas" },
];

const TABS = [
  { key: "actividades", label: "Actividades" },
  { key: "duplicados", label: "Duplicados" },
];

const SUBTITLES = {
  guide: "Todas las actividades de la agencia. Solo puedes clasificar y editar las que describiste tú.",
  admin: "Todas las actividades de la agencia. Las nuevas no se usan en el generador hasta que las validas.",
  duplicados:
    "Posibles duplicados: misma atracción y nombre parecido. Al fusionar, los itinerarios que usaban la eliminada pasan a la que conservas.",
};

function typeLabel(code: string | null) {
  return TYPE_OPTIONS.find(option => option.value === code)?.label ?? "";
}

function effortLabel(level: number) {
  return EFFORT_OPTIONS.find(option => option.value === String(level))?.label ?? "";
}

function activitiesText(count: number) {
  return count === 1 ? "1 actividad" : `${count} actividades`;
}

function usesText(count: number) {
  return count === 1 ? "1 uso" : `${count} usos`;
}

export function ActivitiesPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "guide" && user.role !== "admin") return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <ActivitiesView user={user} />;
}

function ActivitiesView({ user }: { user: User }) {
  const isAdmin = user.role === "admin";
  const [searchParams, setSearchParams] = useSearchParams();
  const activities = useActivities();
  const categories = useCategories();
  const attractions = useAttractions();
  const duplicates = useDuplicates(isAdmin);
  const [selection, setSelection] = useState<Selection>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const tab: Tab = isAdmin && searchParams.get("tab") === "duplicados" ? "duplicados" : "actividades";
  const pendingPairs = duplicates.data?.filter(pair => pair.status === "pending") ?? [];

  function changeTab(key: string) {
    setSelection(null);
    setSearchParams(key === "duplicados" ? { tab: key } : {}, { replace: true });
  }

  const header = (
    <PageHeader
      title={tab === "duplicados" ? "Actividades duplicadas" : "Banco de actividades"}
      subtitle={tab === "duplicados" ? SUBTITLES.duplicados : isAdmin ? SUBTITLES.admin : SUBTITLES.guide}
      actions={
        !isAdmin && (
          <Button variant="primary" icon="plus" onClick={() => setSelection("new")}>
            Nueva actividad
          </Button>
        )
      }
    />
  );

  const queries = [activities, categories, attractions];
  let content: ReactNode;

  if (queries.some(query => query.isPending)) {
    content = <LoadingPanel rows={8} />;
  } else if (queries.some(query => query.isError) || !activities.data || !categories.data || !attractions.data) {
    const failed = queries.find(query => query.isError);
    content = (
      <LoadError
        title="No se pudieron cargar las actividades"
        error={failed?.error ?? null}
        onRetry={() => queries.forEach(query => query.refetch())}
      />
    );
  } else if (tab === "duplicados") {
    content = <DuplicatesTab duplicates={duplicates} categories={categories.data} onToast={setToast} />;
  } else {
    content = (
      <BankTab
        user={user}
        activities={activities.data}
        categories={categories.data}
        attractions={attractions.data}
        pendingPairs={pendingPairs}
        selection={selection}
        onSelect={setSelection}
        onShowDuplicates={() => changeTab("duplicados")}
        onToast={setToast}
      />
    );
  }

  return (
    <>
      {header}

      {isAdmin && (
        <Tabs
          items={TABS.map(item =>
            item.key === "duplicados" && duplicates.data ? { ...item, count: pendingPairs.length } : item,
          )}
          value={tab}
          label="Secciones del banco de actividades"
          onChange={changeTab}
        />
      )}

      {content}

      {toast && (
        <div className="activities__toast">
          <Toast tone={toast.tone} onClose={() => setToast(null)}>
            {toast.text}
          </Toast>
        </div>
      )}
    </>
  );
}

type BankTabProps = {
  user: User;
  activities: Activity[];
  categories: Category[];
  attractions: Attraction[];
  pendingPairs: DuplicatePair[];
  selection: Selection;
  onSelect: (selection: Selection) => void;
  onShowDuplicates: () => void;
  onToast: (toast: ToastMessage) => void;
};

function BankTab({
  user,
  activities,
  categories,
  attractions,
  pendingPairs,
  selection,
  onSelect,
  onShowDuplicates,
  onToast,
}: BankTabProps) {
  const saveActivity = useSaveActivity();
  const validateActivity = useValidateActivity();

  const isAdmin = user.role === "admin";
  const selected = typeof selection === "number" ? activities.find(item => item.id === selection) : undefined;
  const isDrawerOpen = selection === "new" || selected !== undefined;
  const pending = activities.filter(item => item.status === "pending").length;

  function handleSave(form: ActivityForm) {
    const id = selected?.id ?? null;

    saveActivity.mutate(
      { id, form },
      {
        onSuccess: saved => {
          onSelect(null);
          onToast({
            tone: "ok",
            text:
              saved.status === "pending"
                ? `Guardaste «${saved.name}». Queda pendiente hasta que la valide el administrador.`
                : `Guardaste «${saved.name}».`,
          });
        },
        onError: error => onToast({ tone: "bad", text: `No se pudo guardar la actividad: ${error.message}` }),
      },
    );
  }

  function handleValidate(result: ActivityValidationResult, observations: string) {
    if (!selected) return;

    validateActivity.mutate(
      { id: selected.id, body: { result, observations } },
      {
        onSuccess: validated => {
          onSelect(null);
          onToast({
            tone: "ok",
            text:
              result === "approved"
                ? `Validaste «${validated.name}». Ya se puede usar en el generador.`
                : `Rechazaste «${validated.name}» con tus observaciones.`,
          });
        },
        onError: error => onToast({ tone: "bad", text: `No se pudo registrar la validación: ${error.message}` }),
      },
    );
  }

  if (activities.length === 0 && selection !== "new") {
    return (
      <Panel>
        {isAdmin ? (
          <EmptyState icon="layers" title="Todavía no hay actividades">
            Los guías las describen desde su Banco de actividades.
          </EmptyState>
        ) : (
          <EmptyState
            icon="layers"
            title="Todavía no hay actividades"
            action={
              <Button variant="primary" icon="plus" onClick={() => onSelect("new")}>
                Nueva actividad
              </Button>
            }
          >
            Describe la primera: quedará pendiente hasta que la valide el administrador.
          </EmptyState>
        )}
      </Panel>
    );
  }

  const hasPendingPair = (id: number) => pendingPairs.some(pair => pair.a.id === id || pair.b.id === id);

  return (
    <>
      {isAdmin && pending > 0 && (
        <Alert
          tone="warn"
          title={pending === 1 ? "1 actividad pendiente de validar" : `${pending} actividades pendientes de validar`}
        >
          Las actividades nuevas no se usan en el generador hasta que las validas. Revisa antes si duplican otra.
        </Alert>
      )}

      <div className="activities__columns">
        <div className="activities__main">
          <ActivitiesTable
            user={user}
            activities={activities}
            categories={categories}
            selectedId={selected?.id}
            onSelect={activity => onSelect(activity.id)}
          />
        </div>

        {isDrawerOpen && (
          <ActivityDrawer
            // A fresh form for each activity, and again once it is saved or validated
            key={`${selected?.id ?? "new"}-${selected?.status}`}
            activity={selected ?? null}
            activities={activities}
            categories={categories}
            attractions={attractions}
            user={user}
            hasPendingPair={selected ? hasPendingPair(selected.id) : false}
            isSaving={saveActivity.isPending}
            isValidating={validateActivity.isPending}
            onSave={handleSave}
            onValidate={handleValidate}
            onShowDuplicates={onShowDuplicates}
            onClose={() => onSelect(null)}
          />
        )}
      </div>
    </>
  );
}

type ActivitiesTableProps = {
  user: User;
  activities: Activity[];
  categories: Category[];
  selectedId?: number;
  onSelect: (activity: Activity) => void;
};

function ActivitiesTable({ user, activities, categories, selectedId, onSelect }: ActivitiesTableProps) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [effort, setEffort] = useState("");
  const [onlyMine, setOnlyMine] = useState(false);
  const [status, setStatus] = useState("");

  const isAdmin = user.role === "admin";
  const categoryName = (id: number | null) => categories.find(category => category.id === id)?.name ?? "";
  const isMine = (activity: Activity) => !isAdmin && activity.user_id === user.id;
  const text = query.trim().toLowerCase();

  const rows = activities.filter(
    activity =>
      (!text ||
        activity.name.toLowerCase().includes(text) ||
        (activity.attraction_name ?? "").toLowerCase().includes(text)) &&
      (!type || activity.activity_type_code === type) &&
      (!categoryId || String(activity.category_id) === categoryId) &&
      (!effort || String(activity.effort_level) === effort) &&
      (!onlyMine || isMine(activity)) &&
      (!status || activity.status === status),
  );

  function resetFilters() {
    setQuery("");
    setType("");
    setCategoryId("");
    setEffort("");
    setOnlyMine(false);
    setStatus("");
  }

  // Also the filter line of the PDF
  const subtitle = [
    categoryId ? categoryName(Number(categoryId)) : "Todas las categorías",
    type && typeLabel(type),
    effort && `esfuerzo ${effortLabel(Number(effort)).toLowerCase()}`,
    onlyMine && "solo las tuyas",
    status && STATUS_OPTIONS.find(option => option.value === status)?.label.toLowerCase(),
    text && `«${query.trim()}»`,
  ]
    .filter(Boolean)
    .join(" · ");

  const columns: Column<Activity>[] = [
    {
      key: "name",
      label: "Actividad",
      render: activity => (
        <span className="activities__name">
          <span className="activities__name-title">{activity.name}</span>
          <span className="activities__muted">{activity.attraction_name}</span>
          {activity.status !== "approved" && (
            <StatusPill status={ACTIVITY_STATUS_PILL[activity.status].status}>
              {ACTIVITY_STATUS_PILL[activity.status].label}
            </StatusPill>
          )}
        </span>
      ),
      exportValue: activity =>
        [
          activity.name,
          activity.attraction_name && `(${activity.attraction_name})`,
          activity.status !== "approved" && `· ${ACTIVITY_STATUS_PILL[activity.status].label}`,
        ]
          .filter(Boolean)
          .join(" "),
    },
    {
      key: "activity_type_code",
      label: "Tipo",
      render: activity => {
        const tone = toActivityType(activity.activity_type_code);
        return tone && <Badge tone={tone} />;
      },
      sortValue: activity => typeLabel(activity.activity_type_code),
      exportValue: activity => typeLabel(activity.activity_type_code),
    },
    {
      key: "category",
      label: "Categoría",
      render: activity => categoryName(activity.category_id),
      sortValue: activity => categoryName(activity.category_id),
      exportValue: activity => categoryName(activity.category_id),
    },
    {
      key: "effort_level",
      label: "Esfuerzo",
      render: activity => <EffortMeter level={toEffortLevel(activity.effort_level)} />,
      exportValue: activity => effortLabel(activity.effort_level),
    },
    {
      key: "duration_minutes",
      label: "Duración",
      align: "right",
      render: activity => <span className="activities__mono">{formatDuration(activity.duration_minutes)}</span>,
      exportValue: activity => formatDuration(activity.duration_minutes),
    },
    {
      key: "author_name",
      label: "Autor",
      render: activity => (
        <span className="activities__author">
          {activity.author_name}
          {isMine(activity) && <Badge>Tú</Badge>}
        </span>
      ),
    },
    {
      key: "uses",
      label: "Usos",
      align: "right",
      render: activity => <span className="activities__mono">{activity.uses}</span>,
    },
    {
      key: "action",
      label: "",
      sortable: false,
      render: activity => {
        // RN-01: the guide edits only what they described
        if (!isAdmin && !isMine(activity)) return <span className="activities__muted">Solo lectura</span>;
        return (
          <Button
            variant="ghost"
            size="sm"
            onClick={event => {
              // The row opens it too; once is enough
              event.stopPropagation();
              onSelect(activity);
            }}
          >
            {!isAdmin ? "Editar" : activity.status === "pending" ? "Revisar" : "Ver"}
          </Button>
        );
      },
      exportValue: () => "",
    },
  ];

  return (
    <>
      <FilterBar summary={activitiesText(rows.length)} onReset={resetFilters}>
        <Field
          id="activities-query"
          label="Buscar"
          placeholder="Actividad o atracción"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Field
          id="activities-type"
          label="Tipo"
          options={[{ value: "", label: "Todos" }, ...TYPE_OPTIONS]}
          value={type}
          onChange={event => setType(event.target.value)}
        />
        <Field
          id="activities-category"
          label="Categoría"
          options={[
            { value: "", label: "Todas" },
            ...categories.map(category => ({ value: String(category.id), label: category.name })),
          ]}
          value={categoryId}
          onChange={event => setCategoryId(event.target.value)}
        />
        <Field
          id="activities-effort"
          label="Esfuerzo"
          options={[{ value: "", label: "Todos" }, ...EFFORT_OPTIONS]}
          value={effort}
          onChange={event => setEffort(event.target.value)}
        />
        {isAdmin ? (
          <Field
            id="activities-status"
            label="Estado"
            options={STATUS_OPTIONS}
            value={status}
            onChange={event => setStatus(event.target.value)}
          />
        ) : (
          <Checkbox
            id="activities-mine"
            label="Solo las mías"
            checked={onlyMine}
            onChange={event => setOnlyMine(event.target.checked)}
          />
        )}
      </FilterBar>

      <DataTable
        title="Actividades"
        subtitle={subtitle}
        columns={columns}
        rows={rows}
        defaultSort={{ key: "uses", dir: "desc" }}
        onRowClick={onSelect}
        selectedKey={selectedId}
        exportable
        footer="Usos: veces que la actividad aparece en itinerarios aprobados."
        emptyText="No hay actividades con estos filtros."
      />
    </>
  );
}

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

function ActivityDrawer({
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
    if (!name.trim() || durationError) {
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

      <Field
        id="activity-attraction"
        label="Atracción"
        options={attractions.map(item => ({ value: String(item.id), label: item.name }))}
        value={attractionId}
        disabled={!canEdit}
        hint={canEdit ? "La atracción fija la ubicación en la red de conexiones." : undefined}
        onChange={event => setAttractionId(event.target.value)}
      />

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
    </Drawer>
  );
}

type DuplicatesTabProps = {
  duplicates: ReturnType<typeof useDuplicates>;
  categories: Category[];
  onToast: (toast: ToastMessage) => void;
};

const RESOLUTION_PILL = {
  merged: { status: "finalizado", label: "Fusionadas" },
  dismissed: { status: "pendiente", label: "No son duplicados" },
} as const;

function DuplicatesTab({ duplicates, categories, onToast }: DuplicatesTabProps) {
  const merge = useMergeActivity();
  const dismiss = useDismissDuplicate();
  const [view, setView] = useState("pending");

  if (duplicates.isPending) return <LoadingPanel rows={8} />;
  if (duplicates.isError) {
    return (
      <LoadError
        title="No se pudieron cargar los duplicados"
        error={duplicates.error}
        onRetry={() => duplicates.refetch()}
      />
    );
  }

  const pending = duplicates.data.filter(pair => pair.status === "pending");
  const resolved = duplicates.data.filter(pair => pair.status !== "pending");
  const isBusy = merge.isPending || dismiss.isPending;

  function handleMerge(removed: Activity, kept: Activity) {
    merge.mutate(
      { id: removed.id, into: kept.id },
      {
        onSuccess: () =>
          onToast({
            tone: "ok",
            text: removed.uses
              ? `Fusionaste «${removed.name}» en «${kept.name}». Sus ${usesText(removed.uses)} pasaron a la que conservas.`
              : `Fusionaste «${removed.name}» en «${kept.name}».`,
          }),
        onError: error => onToast({ tone: "bad", text: `No se pudo fusionar: ${error.message}` }),
      },
    );
  }

  function handleDismiss(pair: DuplicatePair) {
    dismiss.mutate(pair.id, {
      onSuccess: () => onToast({ tone: "ok", text: `Marcaste «${pair.a.name}» y «${pair.b.name}» como distintas.` }),
      onError: error => onToast({ tone: "bad", text: `No se pudo descartar el aviso: ${error.message}` }),
    });
  }

  const columns: Column<DuplicatePair>[] = [
    {
      key: "pair",
      label: "Actividades",
      render: pair => (
        <span className="activities__name">
          <span className="activities__name-title">{pair.a.name}</span>
          <span className="activities__muted">{pair.b.name}</span>
        </span>
      ),
      sortValue: pair => pair.a.name,
      exportValue: pair => `${pair.a.name} / ${pair.b.name}`,
    },
    {
      key: "attraction",
      label: "Atracción",
      render: pair => pair.a.attraction_name,
      sortValue: pair => pair.a.attraction_name,
      exportValue: pair => pair.a.attraction_name ?? "",
    },
    {
      key: "score",
      label: "Parecido",
      align: "right",
      render: pair => <span className="activities__mono">{pair.score} %</span>,
      exportValue: pair => `${pair.score} %`,
    },
    {
      key: "status",
      label: "Resultado",
      render: pair => {
        const pill = RESOLUTION_PILL[pair.status as keyof typeof RESOLUTION_PILL];
        return <StatusPill status={pill.status}>{pill.label}</StatusPill>;
      },
      sortValue: pair => RESOLUTION_PILL[pair.status as keyof typeof RESOLUTION_PILL].label,
      exportValue: pair => RESOLUTION_PILL[pair.status as keyof typeof RESOLUTION_PILL].label,
    },
    {
      key: "kept",
      label: "Se conserva",
      render: pair => keptName(pair),
      sortValue: pair => keptName(pair),
      exportValue: pair => keptName(pair),
    },
    {
      key: "resolved_date",
      label: "Fecha",
      render: pair => (pair.resolved_date ? formatDate(pair.resolved_date) : ""),
      exportValue: pair => (pair.resolved_date ? formatDate(pair.resolved_date) : ""),
    },
    { key: "resolver_name", label: "Revisó" },
  ];

  return (
    <>
      <div className="activities__view">
        <Tabs
          variant="segmented"
          label="Estado"
          items={[
            { key: "pending", label: "Por revisar", count: pending.length },
            { key: "resolved", label: "Resueltos", count: resolved.length },
          ]}
          value={view}
          onChange={setView}
        />
      </div>

      {view === "resolved" ? (
        <DataTable
          title="Duplicados resueltos"
          subtitle="Fusionados o descartados por el administrador"
          columns={columns}
          rows={resolved}
          defaultSort={{ key: "resolved_date", dir: "desc" }}
          exportable
          emptyText="Todavía no se ha resuelto ningún duplicado."
        />
      ) : pending.length === 0 ? (
        <Panel>
          <EmptyState icon="check-circle" title="No quedan duplicados por revisar">
            El sistema avisa al guía al crear una actividad parecida a otra de la misma atracción.
          </EmptyState>
        </Panel>
      ) : (
        pending.map(pair => (
          <DuplicateCard
            key={pair.id}
            pair={pair}
            categories={categories}
            isBusy={isBusy}
            onMerge={handleMerge}
            onDismiss={() => handleDismiss(pair)}
          />
        ))
      )}
    </>
  );
}

function keptName(pair: DuplicatePair) {
  if (pair.status === "dismissed") return "Las dos";
  return [pair.a, pair.b].find(activity => activity.id === pair.kept_id)?.name ?? "";
}

type DuplicateCardProps = {
  pair: DuplicatePair;
  categories: Category[];
  isBusy: boolean;
  onMerge: (removed: Activity, kept: Activity) => void;
  onDismiss: () => void;
};

type CompareRow = {
  label: string;
  value: (activity: Activity) => string | number | null;
  render?: (activity: Activity) => ReactNode;
};

function DuplicateCard({ pair, categories, isBusy, onMerge, onDismiss }: DuplicateCardProps) {
  const { a, b } = pair;
  // The one already in more itineraries is kept by default
  const [keep, setKeep] = useState(a.uses >= b.uses ? "a" : "b");

  const kept = keep === "a" ? a : b;
  const removed = keep === "a" ? b : a;
  const categoryName = (activity: Activity) =>
    categories.find(category => category.id === activity.category_id)?.name ?? "";

  const rows: CompareRow[] = [
    { label: "Atracción", value: activity => activity.attraction_name },
    { label: "Autor", value: activity => activity.author_name },
    {
      label: "Tipo",
      value: activity => activity.activity_type_code,
      render: activity => {
        const tone = toActivityType(activity.activity_type_code);
        return tone && <Badge tone={tone} />;
      },
    },
    { label: "Categoría", value: categoryName },
    {
      label: "Esfuerzo",
      value: activity => activity.effort_level,
      render: activity => <EffortMeter level={toEffortLevel(activity.effort_level)} />,
    },
    { label: "Duración", value: activity => formatDuration(activity.duration_minutes) },
    { label: "Usos", value: activity => activity.uses },
    {
      label: "Estado",
      value: activity => activity.status,
      render: activity => (
        <StatusPill status={ACTIVITY_STATUS_PILL[activity.status].status}>
          {ACTIVITY_STATUS_PILL[activity.status].label}
        </StatusPill>
      ),
    },
  ];

  return (
    <Panel title={`${a.name} · ${b.name}`} subtitle={`${pair.score} % de parecido · misma atracción`} flush>
      <div className="activities__compare-scroll">
        <table className="activities__compare">
          <thead>
            <tr>
              <th scope="col" className="activities__compare-key">
                Campo
              </th>
              <th scope="col">A · {a.name}</th>
              <th scope="col">B · {b.name}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(row => {
              const differs = row.value(a) !== row.value(b);
              const cellClass = differs ? "activities__compare-diff" : undefined;
              return (
                <tr key={row.label}>
                  <th scope="row" className="activities__compare-key">
                    {row.label}
                  </th>
                  <td className={cellClass}>{row.render ? row.render(a) : row.value(a)}</td>
                  <td className={cellClass}>{row.render ? row.render(b) : row.value(b)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="activities__compare-foot">
        <div className="activities__keep">
          <span className="activities__keep-label">Conservar</span>
          <Tabs
            variant="segmented"
            label="Conservar"
            items={[
              { key: "a", label: "A" },
              { key: "b", label: "B" },
            ]}
            value={keep}
            onChange={setKeep}
          />
          <span className="activities__muted">
            {removed.uses
              ? `Sus ${usesText(removed.uses)} ${removed.uses === 1 ? "pasará" : "pasarán"} a la que conservas.`
              : "La otra no se usa en ningún itinerario."}
          </span>
        </div>
        <div className="activities__keep-actions">
          <Button variant="ghost" disabled={isBusy} onClick={onDismiss}>
            No son duplicados
          </Button>
          <Button variant="danger" disabled={isBusy} onClick={() => onMerge(removed, kept)}>
            Fusionar en una
          </Button>
        </div>
      </div>
    </Panel>
  );
}
