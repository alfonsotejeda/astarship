import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { ActivityRow } from "@/components/ActivityRow/ActivityRow";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { Panel } from "@/components/Panel/Panel";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import type { Activity } from "@/lib/api/activities";
import type { Category } from "@/lib/api/catalogs";
import type { TypeOption } from "../lib/form";
import { toRowActivity } from "../lib/mappers";

type CandidatesPanelProps = {
  activities: UseQueryResult<Activity[]>;
  candidateIds: number[];
  categories: Category[];
  types: TypeOption[];
  inPackage: (activity: Activity) => boolean;
  onChange: (candidateIds: number[]) => void;
};

function matches(activity: Activity, query: string, type: string) {
  const text = `${activity.name} ${activity.attraction_name ?? ""}`.toLowerCase();
  return text.includes(query.trim().toLowerCase()) && (!type || activity.activity_type_code === type);
}

export function CandidatesPanel({ activities, candidateIds, categories, types, inPackage, onChange }: CandidatesPanelProps) {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("");

  const candidates = activities.data ?? [];
  const visible = candidates.filter(activity => matches(activity, query, typeFilter));
  const selectedCount = candidates.filter(activity => candidateIds.includes(activity.id)).length;
  const typeOptions = [{ value: "", label: "Todos" }, ...types.map(type => ({ value: type.code, label: type.label }))];

  function toggle(id: number, isSelected: boolean) {
    onChange(isSelected ? [...candidateIds, id] : candidateIds.filter(item => item !== id));
  }

  function clearFilters() {
    setQuery("");
    setTypeFilter("");
  }

  return (
    <Panel
      title="Actividades candidatas"
      subtitle={`${selectedCount} seleccionadas de ${candidates.length} disponibles en el paquete`}
      flush
    >
      <div className="generator__filters">
        <Field
          id="generator-query"
          label="Buscar"
          placeholder="Nombre o atracción"
          className="generator__search"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Field
          id="generator-type"
          label="Tipo"
          options={typeOptions}
          className="generator__type-filter"
          value={typeFilter}
          onChange={event => setTypeFilter(event.target.value)}
        />
        <Button
          variant="ghost"
          size="sm"
          disabled={visible.length === 0}
          onClick={() => onChange([...new Set([...candidateIds, ...visible.map(activity => activity.id)])])}
        >
          Seleccionar todas
        </Button>
      </div>

      {activities.isPending && (
        <div className="generator__loading" aria-busy="true">
          <Skeleton height={56} />
          <Skeleton height={56} />
          <Skeleton height={56} />
        </div>
      )}

      {activities.isError && (
        <div className="generator__loading">
          <Alert
            tone="bad"
            title="No se pudieron cargar las actividades"
            action={
              <Button size="sm" onClick={() => activities.refetch()}>
                Reintentar
              </Button>
            }
          >
            {activities.error.message}
          </Alert>
        </div>
      )}

      {activities.isSuccess && candidates.length === 0 && (
        <EmptyState icon="layers" title="Este paquete no tiene actividades en el banco">
          Registra actividades de sus categorías en el banco de actividades para poder generar.
        </EmptyState>
      )}

      {candidates.length > 0 && visible.length === 0 && (
        <EmptyState
          title="Ninguna actividad coincide con la búsqueda"
          action={
            <Button size="sm" onClick={clearFilters}>
              Quitar filtros
            </Button>
          }
        />
      )}

      {visible.map(activity => {
        const category = categories.find(item => item.id === activity.category_id)?.name;

        return (
          <ActivityRow
            key={activity.id}
            activity={toRowActivity(activity, category)}
            selected={candidateIds.includes(activity.id)}
            onSelectChange={isSelected => toggle(activity.id, isSelected)}
            warning={
              inPackage(activity) ? undefined : `${category ?? "Su categoría"} no está entre las categorías del paquete`
            }
          />
        );
      })}
    </Panel>
  );
}
