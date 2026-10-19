import { useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column, SortState } from "@/components/DataTable/DataTable";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import { ActivityPanel } from "./ActivityPanel";
import { DuplicatesTab } from "./DuplicatesTab";
import {
  CATEGORY_LABEL,
  CATEGORY_OPTIONS,
  EFFORT_LABEL,
  EFFORT_OPTIONS,
  EFFORT_RANK,
  TYPE_LABEL,
  TYPE_OPTIONS,
  attractionLabel,
  formatDuration,
  normalize,
  withAll,
} from "./activityData";
import type { ActivityDraft, BankActivity } from "./activityData";
import { useActivities } from "./useActivities";
import "./ActivitiesPage.css";

type PanelState = { activityId?: number } | null;
type ToastState = { tone: "ok" | "info"; text: string } | null;
type Filters = { query: string; type: string; category: string; effort: string; mine: boolean };

const NO_FILTERS: Filters = { query: "", type: "", category: "", effort: "", mine: false };
const NEW_BUTTON_ID = "activities-new";

const SORT_LABEL: Record<string, string> = {
  name: "actividad",
  type: "tipo",
  category: "categoría",
  effort: "esfuerzo",
  minutes: "duración",
  author: "autor",
  uses: "usos en itinerarios finales",
};

const TYPE_FILTER_OPTIONS = withAll(TYPE_OPTIONS, "Todos");
const CATEGORY_FILTER_OPTIONS = withAll(CATEGORY_OPTIONS, "Todas");
const EFFORT_FILTER_OPTIONS = withAll(EFFORT_OPTIONS, "Todos");

/**
 * Activity bank (P-02 and P-21), route `/actividades`, for guides and administrators.
 *
 * Everyone sees the table with filters and the side panel to create an activity (P-02).
 * Administrators also get the "Duplicados" tab to compare and merge look-alike activities (P-21).
 * RN-01: a guide edits only the activities they described; the rest are read-only.
 */
export function ActivitiesPage() {
  const { user } = useAuth();
  const userName = user?.name ?? "";
  const isAdmin = user?.role === "admin";

  const { activities, pairs, resolved, create, update, merge, dismiss } = useActivities();

  const [tab, setTab] = useState<"activities" | "duplicates">("activities");
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<SortState>({ key: "uses", dir: "desc" });
  const [panel, setPanel] = useState<PanelState>(null);
  const [toast, setToast] = useState<ToastState>(null);
  const returnFocusTo = useRef(NEW_BUTTON_ID);

  // RN-01: a guide edits only the activities they described; others are read-only.
  // Administrators are not covered by that rule.
  const isOwn = (activity: BankActivity) => activity.author === userName;
  const canEdit = (activity: BankActivity) => isAdmin || isOwn(activity);

  const visible = useMemo(() => {
    const query = normalize(filters.query);
    return activities.filter(activity => {
      if (filters.type && activity.type !== filters.type) return false;
      if (filters.category && activity.category !== filters.category) return false;
      if (filters.effort && activity.effort !== filters.effort) return false;
      if (filters.mine && activity.author !== userName) return false;
      if (query && !normalize(`${activity.name} ${attractionLabel(activity.attractionId)}`).includes(query)) return false;
      return true;
    });
  }, [activities, filters, userName]);

  // Closing the panel returns focus to whatever opened it
  const panelOpen = panel !== null;
  const wasOpen = useRef(false);
  useEffect(() => {
    if (wasOpen.current && !panelOpen) document.getElementById(returnFocusTo.current)?.focus();
    wasOpen.current = panelOpen;
  }, [panelOpen]);

  function openPanel(activityId?: number) {
    returnFocusTo.current = activityId === undefined ? NEW_BUTTON_ID : `activity-edit-${activityId}`;
    setPanel({ activityId });
  }

  function handleSave(draft: ActivityDraft) {
    if (panel?.activityId === undefined) {
      create(draft, userName);
      setToast({ tone: "ok", text: `Actividad «${draft.name}» guardada.` });
    } else {
      update(panel.activityId, draft);
      setToast({ tone: "ok", text: `Cambios en «${draft.name}» guardados.` });
    }
    setPanel(null);
  }

  function handleMerge(pairId: string, keepSide: "a" | "b") {
    const result = merge(pairId, keepSide);
    if (!result) return;
    const { keep, lose } = result;
    const moved = lose.uses
      ? ` ${lose.uses === 1 ? "Su 1 uso pasó" : `Sus ${lose.uses} usos pasaron`} a la que conservas.`
      : "";
    setToast({ tone: "ok", text: `Fusionadas en «${keep.name}».${moved}` });
  }

  function handleDismiss(pairId: string) {
    dismiss(pairId);
    setToast({ tone: "info", text: "Marcadas como actividades distintas." });
  }

  function changeTab(key: string) {
    setPanel(null);
    setTab(key as "activities" | "duplicates");
  }

  const columns: Column<BankActivity>[] = [
    {
      key: "name",
      label: "Actividad",
      render: row => (
        <div className="activities-page__name">
          <span className="activities-page__name-main">{row.name}</span>
          <span className="activities-page__name-sub">{attractionLabel(row.attractionId)}</span>
        </div>
      ),
      exportValue: row => `${row.name} (${attractionLabel(row.attractionId)})`,
    },
    {
      key: "type",
      label: "Tipo",
      render: row => <Badge tone={row.type} />,
      sortValue: row => TYPE_LABEL[row.type],
      exportValue: row => TYPE_LABEL[row.type],
    },
    {
      key: "category",
      label: "Categoría",
      render: row => CATEGORY_LABEL[row.category],
      sortValue: row => CATEGORY_LABEL[row.category],
      exportValue: row => CATEGORY_LABEL[row.category],
    },
    {
      key: "effort",
      label: "Esfuerzo",
      render: row => <EffortMeter level={row.effort} />,
      sortValue: row => EFFORT_RANK[row.effort],
      exportValue: row => EFFORT_LABEL[row.effort],
    },
    {
      key: "minutes",
      label: "Duración",
      align: "right",
      render: row => formatDuration(row.minutes),
      exportValue: row => formatDuration(row.minutes),
    },
    {
      key: "author",
      label: "Autor",
      render: row =>
        isOwn(row) ? (
          <span>
            {row.author} <Badge tone="neutral">Tú</Badge>
          </span>
        ) : (
          row.author
        ),
    },
    { key: "uses", label: "Usos", align: "right" },
    {
      key: "actions",
      label: "",
      sortable: false,
      render: row =>
        canEdit(row) ? (
          <Button
            id={`activity-edit-${row.id}`}
            variant="ghost"
            size="sm"
            aria-label={`Editar ${row.name}`}
            onClick={() => openPanel(row.id)}
          >
            Editar
          </Button>
        ) : (
          <span className="activities-page__readonly">Solo lectura</span>
        ),
      exportValue: () => "",
    },
  ];

  const total = activities.length;
  const count = visible.length;
  const noun = (n: number) => (n === 1 ? "actividad" : "actividades");
  const summary = count === total ? `${total} ${noun(total)}` : `${count} de ${total} ${noun(total)}`;
  const categoryText = filters.category ? CATEGORY_LABEL[filters.category as keyof typeof CATEGORY_LABEL] : "Todas las categorías";
  const tableSubtitle = `${categoryText}${sort.key ? ` · ordenado por ${SORT_LABEL[sort.key]}` : ""}`;

  const editing = panel?.activityId === undefined ? undefined : activities.find(item => item.id === panel.activityId);

  const header = (
    <PageHeader
      title="Banco de actividades"
      subtitle={
        isAdmin
          ? "Todas las actividades de la agencia."
          : "Todas las actividades de la agencia. Solo puedes clasificar y editar las que describiste tú."
      }
      actions={
        tab === "activities" ? (
          <Button id={NEW_BUTTON_ID} variant="primary" icon="plus" onClick={() => openPanel()}>
            Nueva actividad
          </Button>
        ) : undefined
      }
    />
  );

  const bank = (
    <>
      <FilterBar summary={summary} onReset={() => setFilters(NO_FILTERS)}>
        <Field
          id="bank-query"
          label="Buscar"
          type="search"
          placeholder="Actividad o atracción"
          value={filters.query}
          onChange={event => setFilters(current => ({ ...current, query: event.target.value }))}
        />
        <Field
          id="bank-type"
          label="Tipo"
          options={TYPE_FILTER_OPTIONS}
          value={filters.type}
          onChange={event => setFilters(current => ({ ...current, type: event.target.value }))}
        />
        <Field
          id="bank-category"
          label="Categoría"
          options={CATEGORY_FILTER_OPTIONS}
          value={filters.category}
          onChange={event => setFilters(current => ({ ...current, category: event.target.value }))}
        />
        <Field
          id="bank-effort"
          label="Esfuerzo"
          options={EFFORT_FILTER_OPTIONS}
          value={filters.effort}
          onChange={event => setFilters(current => ({ ...current, effort: event.target.value }))}
        />
        <Checkbox
          label="Solo las mías"
          checked={filters.mine}
          onChange={event => setFilters(current => ({ ...current, mine: event.target.checked }))}
        />
      </FilterBar>

      <div className="activities-page__body">
        <div className="activities-page__table">
          <DataTable
            title="Actividades"
            subtitle={tableSubtitle}
            columns={columns}
            rows={visible}
            sort={sort}
            onSortChange={setSort}
            exportable
            footer="Usos: veces que la actividad aparece en itinerarios aprobados."
          />
        </div>

        {panel && (
          <ActivityPanel
            key={panel.activityId ?? "new"}
            activity={editing}
            activities={activities}
            onSave={handleSave}
            onClose={() => setPanel(null)}
          />
        )}
      </div>
    </>
  );

  return (
    <div className="activities-page">
      {header}

      {isAdmin && (
        <Tabs
          label="Secciones del banco"
          items={[
            { key: "activities", label: "Actividades" },
            { key: "duplicates", label: "Duplicados", count: pairs.length },
          ]}
          value={tab}
          onChange={changeTab}
        />
      )}

      {tab === "activities" || !isAdmin ? (
        bank
      ) : (
        <DuplicatesTab pairs={pairs} resolved={resolved} onMerge={handleMerge} onDismiss={handleDismiss} />
      )}

      {toast && (
        <div className="activities-page__toast">
          <Toast tone={toast.tone} onClose={() => setToast(null)}>
            {toast.text}
          </Toast>
        </div>
      )}
    </div>
  );
}
