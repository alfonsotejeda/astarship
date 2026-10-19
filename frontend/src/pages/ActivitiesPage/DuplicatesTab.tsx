import { useState } from "react";
import { Button } from "@/components/Button/Button";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Panel } from "@/components/Panel/Panel";
import { Tabs } from "@/components/Tabs/Tabs";
import {
  CATEGORY_LABEL,
  EFFORT_LABEL,
  SAMPLE_RESOLVED_BEFORE,
  TYPE_LABEL,
  attractionLabel,
  formatDuration,
} from "./activityData";
import type { BankActivity, DuplicatePair, Side } from "./activityData";
import type { ResolvedPair } from "./useActivities";

type DuplicatesTabProps = {
  pairs: DuplicatePair[];
  resolved: ResolvedPair[];
  onMerge: (pairId: string, keep: Side) => void;
  onDismiss: (pairId: string) => void;
};

const FIELDS: { label: string; value: (activity: BankActivity) => string }[] = [
  { label: "Atracción", value: activity => attractionLabel(activity.attractionId) },
  { label: "Autor", value: activity => activity.author },
  { label: "Tipo", value: activity => TYPE_LABEL[activity.type] },
  { label: "Categoría", value: activity => CATEGORY_LABEL[activity.category] },
  { label: "Esfuerzo", value: activity => EFFORT_LABEL[activity.effort] },
  { label: "Duración", value: activity => formatDuration(activity.minutes) },
  { label: "Usos", value: activity => String(activity.uses) },
];

const KEEP_ITEMS = [
  { key: "a", label: "A" },
  { key: "b", label: "B" },
];

const RESOLVED_COLUMNS: Column<ResolvedPair>[] = [
  { key: "title", label: "Actividades" },
  { key: "outcome", label: "Resultado", render: row => (row.outcome === "merged" ? "Fusionadas" : "No son duplicados") },
  { key: "kept", label: "Conservada", render: row => row.kept ?? "—", exportValue: row => row.kept ?? "" },
];

function keepNote(lose: BankActivity) {
  if (!lose.uses) return "La otra no se usa en ningún itinerario.";
  return `${lose.uses === 1 ? "Su 1 uso pasará" : `Sus ${lose.uses} usos pasarán`} a la que conservas.`;
}

/** One pair of activities compared field by field, with the keep selector and the merge and dismiss actions. */
function ComparePair({
  pair,
  keep,
  onKeepChange,
  onMerge,
  onDismiss,
}: {
  pair: DuplicatePair;
  keep: Side;
  onKeepChange: (side: Side) => void;
  onMerge: () => void;
  onDismiss: () => void;
}) {
  const lose = keep === "a" ? pair.b : pair.a;

  return (
    <Panel
      flush
      title={`${pair.a.name}  ·  ${pair.b.name}`}
      subtitle={`${pair.score} % de parecido · misma atracción`}
    >
      <div className="duplicates__scroll">
        <table className="duplicates__table">
          <thead>
            <tr>
              <th scope="col">Campo</th>
              <th scope="col">A · {pair.a.name}</th>
              <th scope="col">B · {pair.b.name}</th>
            </tr>
          </thead>
          <tbody>
            {FIELDS.map(field => {
              const a = field.value(pair.a);
              const b = field.value(pair.b);
              const differs = a !== b;

              return (
                <tr key={field.label}>
                  <th scope="row">{field.label}</th>
                  <td className={differs ? "duplicates__cell--diff" : undefined}>
                    {a}
                    {differs && <span className="activities-page__sr-only"> (difiere)</span>}
                  </td>
                  <td className={differs ? "duplicates__cell--diff" : undefined}>
                    {b}
                    {differs && <span className="activities-page__sr-only"> (difiere)</span>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="duplicates__actions">
        <div className="duplicates__keep">
          <span className="duplicates__keep-label">Conservar</span>
          <Tabs
            variant="segmented"
            label="Conservar"
            items={KEEP_ITEMS}
            value={keep}
            onChange={key => onKeepChange(key as Side)}
          />
          <span className="duplicates__note">{keepNote(lose)}</span>
        </div>

        <div className="duplicates__buttons">
          <Button variant="ghost" onClick={onDismiss}>
            No son duplicados
          </Button>
          <Button variant="danger" onClick={onMerge}>
            Fusionar en una
          </Button>
        </div>
      </div>
    </Panel>
  );
}

/**
 * "Duplicados" tab (P-21): each pair of look-alike activities is shown side by side, with the fields
 * that differ highlighted, to keep one of them (merge, RF-06 / RN-03) or to dismiss the pair.
 */
export function DuplicatesTab({ pairs, resolved, onMerge, onDismiss }: DuplicatesTabProps) {
  const [view, setView] = useState<"pending" | "resolved">("pending");
  const [keepById, setKeepById] = useState<Record<string, Side>>({});

  const stateTabs = [
    { key: "pending", label: "Por revisar", count: pairs.length },
    { key: "resolved", label: "Resueltos", count: SAMPLE_RESOLVED_BEFORE + resolved.length },
  ];

  return (
    <div className="duplicates">
      <p className="duplicates__intro">
        Posibles duplicados: misma atracción y nombre parecido. Al fusionar, los itinerarios que usaban la eliminada
        pasan a la que conservas.
      </p>

      <Tabs label="Estado" items={stateTabs} value={view} onChange={key => setView(key as "pending" | "resolved")} />

      {view === "pending" ? (
        pairs.length ? (
          pairs.map(pair => (
            <ComparePair
              key={pair.id}
              pair={pair}
              keep={keepById[pair.id] ?? "a"}
              onKeepChange={side => setKeepById(current => ({ ...current, [pair.id]: side }))}
              onMerge={() => onMerge(pair.id, keepById[pair.id] ?? "a")}
              onDismiss={() => onDismiss(pair.id)}
            />
          ))
        ) : (
          <Panel>
            <EmptyState icon="check-circle" title="No quedan duplicados por revisar">
              El sistema avisa al guía al crear una actividad parecida a otra de la misma atracción.
            </EmptyState>
          </Panel>
        )
      ) : (
        <Panel flush>
          <DataTable
            bare
            rowKey="id"
            columns={RESOLVED_COLUMNS}
            rows={resolved}
            emptyText="Aún no has resuelto ningún duplicado en esta sesión."
          />
        </Panel>
      )}
    </div>
  );
}
