import { useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EffortMeter } from "@/components/EffortMeter/EffortMeter";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import { ACTIVITY_STATUS_PILL } from "@/lib/activity";
import { toActivityType, toEffortLevel, useDismissDuplicate, useMergeActivity } from "@/lib/api/activities";
import type { Activity, DuplicatePair, useDuplicates } from "@/lib/api/activities";
import type { Category } from "@/lib/api/catalogs";
import { formatDate, formatDuration } from "@/lib/format";
import { usesText } from "./shared";
import type { ToastMessage } from "./shared";

type DuplicatesTabProps = {
  duplicates: ReturnType<typeof useDuplicates>;
  categories: Category[];
  onToast: (toast: ToastMessage) => void;
};

const RESOLUTION_PILL = {
  merged: { status: "finalizado", label: "Fusionadas" },
  dismissed: { status: "pendiente", label: "No son duplicados" },
} as const;

function keptName(pair: DuplicatePair) {
  if (pair.status === "dismissed") return "Las dos";
  return [pair.a, pair.b].find(activity => activity.id === pair.kept_id)?.name ?? "";
}

export function DuplicatesTab({ duplicates, categories, onToast }: DuplicatesTabProps) {
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
