import { useState } from "react";
import type { ReactNode } from "react";
import { Badge } from "@/components/Badge/Badge";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { Package } from "@/lib/api/packages";
import { useGroupTourists } from "@/lib/api/people";
import type { GroupTourist, TravelGroup } from "@/lib/api/people";
import { formatDateRange, formatItineraryCode } from "@/lib/format";
import { matchesTourist } from "@/lib/people";
import { byName, touristsText } from "./shared";
import type { QueryState } from "./shared";

type TouristsTabProps = {
  groups: QueryState<TravelGroup[]>;
  packages: Package[];
  selectedGroup?: TravelGroup;
  selectedTouristId?: number;
  newGroupButton: ReactNode;
  onSelectGroup: (id: number) => void;
  onEditTourist: (tourist: GroupTourist) => void;
};

export function TouristsTab({
  groups,
  packages,
  selectedGroup,
  selectedTouristId,
  newGroupButton,
  onSelectGroup,
  onEditTourist,
}: TouristsTabProps) {
  if (groups.isError) {
    return (
      <LoadError title="No se pudieron cargar los grupos" error={groups.error} onRetry={() => groups.refetch()} />
    );
  }
  if (groups.isPending) return <LoadingPanel />;

  if (!selectedGroup) {
    return (
      <Panel>
        <EmptyState icon="users" title="Todavía no hay grupos de viaje" action={newGroupButton}>
          Los turistas viajan siempre en un grupo: crea el primero para poder darlos de alta.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <div className="people__columns">
      <nav aria-label="Grupos de viaje" className="people__groups">
        <span className="people__eyebrow">Grupos de viaje</span>
        {(groups.data ?? []).map(group => {
          const isSelected = group.id === selectedGroup.id;

          return (
            <button
              key={group.id}
              type="button"
              className={isSelected ? "people__group people__group--selected" : "people__group"}
              aria-pressed={isSelected}
              onClick={() => onSelectGroup(group.id)}
            >
              <span className="people__group-name">{group.name}</span>
              <span className="people__muted">
                {group.package_name} · {touristsText(group.tourist_count)}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="people__main">
        {/* A fresh set of filters for each group */}
        <GroupTourists
          key={selectedGroup.id}
          group={selectedGroup}
          packages={packages}
          selectedTouristId={selectedTouristId}
          onEditTourist={onEditTourist}
        />
      </div>
    </div>
  );
}

type GroupTouristsProps = {
  group: TravelGroup;
  packages: Package[];
  selectedTouristId?: number;
  onEditTourist: (tourist: GroupTourist) => void;
};

function GroupTourists({ group, packages, selectedTouristId, onEditTourist }: GroupTouristsProps) {
  const tourists = useGroupTourists(group.id);
  const [query, setQuery] = useState("");
  const [packageId, setPackageId] = useState("");

  if (tourists.isPending) return <LoadingPanel />;
  if (tourists.isError) {
    return (
      <LoadError
        title="No se pudieron cargar los turistas del grupo"
        error={tourists.error}
        onRetry={() => tourists.refetch()}
      />
    );
  }

  const rows = tourists.data.filter(tourist => matchesTourist(tourist, query, packageId));

  function resetFilters() {
    setQuery("");
    setPackageId("");
  }

  const columns: Column<GroupTourist>[] = [
    {
      key: "name",
      label: "Turista",
      render: tourist => <span className="people__guide-name">{tourist.name}</span>,
    },
    { key: "age", label: "Edad", align: "right" },
    {
      key: "packages",
      label: "Paquetes inscritos",
      sortable: false,
      render: tourist => (
        <span className="people__badges">
          {tourist.packages.map(pkg => (
            <Badge key={pkg.id} tone="category">
              {pkg.name}
            </Badge>
          ))}
        </span>
      ),
      exportValue: tourist => tourist.packages.map(pkg => pkg.name).join(", "),
    },
    {
      key: "itinerary",
      label: "Itinerario asignado",
      render: tourist =>
        tourist.itinerary_id === null ? (
          <StatusPill status="solicitada">Sin asignar</StatusPill>
        ) : (
          <span className="people__mono">{formatItineraryCode(tourist.itinerary_id)}</span>
        ),
      sortValue: tourist => tourist.itinerary_id,
      exportValue: tourist =>
        tourist.itinerary_id === null ? "Sin asignar" : formatItineraryCode(tourist.itinerary_id),
    },
  ];

  return (
    <>
      <FilterBar summary={touristsText(rows.length)} onReset={resetFilters}>
        <Field
          id="people-query"
          label="Buscar turista"
          placeholder="Nombre"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Field
          id="people-package"
          label="Inscrito en"
          options={[
            { value: "", label: "Cualquier paquete" },
            ...byName(packages).map(pkg => ({ value: String(pkg.id), label: pkg.name })),
          ]}
          value={packageId}
          onChange={event => setPackageId(event.target.value)}
        />
      </FilterBar>

      <DataTable
        title={group.name}
        subtitle={`${group.package_name} · ${formatDateRange(group.start_date, group.end_date)} · Guía: ${group.guide_name}`}
        columns={columns}
        rows={rows}
        defaultSort={{ key: "name", dir: "asc" }}
        onRowClick={onEditTourist}
        selectedKey={selectedTouristId}
        exportable
        footer="Pulsa un turista para editarlo."
        emptyText={
          tourists.data.length === 0 ? "Este grupo todavía no tiene turistas." : "No hay turistas con estos filtros."
        }
      />
    </>
  );
}
