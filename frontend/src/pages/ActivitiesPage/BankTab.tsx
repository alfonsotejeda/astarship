import { useState } from "react";
import { Link } from "react-router";
import type { User } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { Panel } from "@/components/Panel/Panel";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { ACTIVITY_STATUS_PILL, EFFORT_OPTIONS, effortLabel, TYPE_OPTIONS, typeLabel } from "@/lib/activity";
import { toActivityType, toEffortLevel, useSaveActivity, useValidateActivity } from "@/lib/api/activities";
import type { Activity, ActivityForm, ActivityValidationResult, DuplicatePair } from "@/lib/api/activities";
import type { Attraction } from "@/lib/api/attractions";
import type { Category } from "@/lib/api/catalogs";
import { formatDuration } from "@/lib/format";
import { ActivityDrawer } from "./ActivityDrawer";
import type { Selection, ToastMessage } from "./shared";

const STATUS_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "pending", label: "Pendientes" },
  { value: "approved", label: "Validadas" },
  { value: "rejected", label: "Rechazadas" },
];

function activitiesText(count: number) {
  return count === 1 ? "1 actividad" : `${count} actividades`;
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

export function BankTab({
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
          {activity.attraction_id !== null && (
            <Link
              to={`/attractions/${activity.attraction_id}`}
              className="activities__attraction-link"
              // The row opens the drawer; the link goes to the attraction instead
              onClick={event => event.stopPropagation()}
            >
              {activity.attraction_name}
            </Link>
          )}
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
        const action = !isAdmin ? "Editar" : activity.status === "pending" ? "Revisar" : "Ver";
        return (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`${action} ${activity.name}`}
            onClick={event => {
              // The row opens it too; once is enough
              event.stopPropagation();
              onSelect(activity);
            }}
          >
            {action}
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
