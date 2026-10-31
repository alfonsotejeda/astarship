import { useState } from "react";
import { useNavigate } from "react-router";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { EffortSplit } from "@/components/ItineraryCard/EffortSplit";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { ItinerarySummary } from "@/lib/api/itineraries";
import { formatDate, formatItineraryCode } from "@/lib/format";
import { itineraryStatus, toEffortCount } from "@/lib/itinerary";
import {
  isBalanced,
  listStatus,
  matchesSearch,
  packageOptions,
  STATUS_LABEL,
  STATUS_OPTIONS,
  STATUS_ORDER,
} from "../lib/filters";

type ItinerariesTableProps = {
  items: ItinerarySummary[];
  title: string;
  allPackagesLabel: string;
};

const REVIEW_LABEL = { validate: "Validar", approve: "Revisar" };

export function ItinerariesTable({ items, title, allPackagesLabel }: ItinerariesTableProps) {
  const navigate = useNavigate();
  const [packageId, setPackageId] = useState("");
  const [status, setStatus] = useState("");
  const [query, setQuery] = useState("");

  const rows = items.filter(
    item =>
      (!packageId || String(item.package_id) === packageId) &&
      (!status || listStatus(item) === status) &&
      matchesSearch(item, query),
  );

  function open(item: ItinerarySummary) {
    navigate(`/itinerarios/${item.id}`);
  }

  function resetFilters() {
    setPackageId("");
    setStatus("");
    setQuery("");
  }

  const columns: Column<ItinerarySummary>[] = [
    {
      key: "id",
      label: "Itinerario",
      render: item => <span className="itineraries__code">{formatItineraryCode(item.id)}</span>,
      exportValue: item => formatItineraryCode(item.id),
    },
    { key: "package_name", label: "Paquete" },
    {
      key: "guide_name",
      label: "Creador",
      render: item => (
        <span className="itineraries__creator">
          {item.guide_name}
          {item.is_mine && <Badge>Tú</Badge>}
        </span>
      ),
    },
    {
      key: "creation_date",
      label: "Creado",
      render: item => <span className="itineraries__mono">{formatDate(item.creation_date)}</span>,
      exportValue: item => formatDate(item.creation_date),
    },
    { key: "days", label: "Días", align: "right" },
    { key: "activity_count", label: "Activ.", align: "right" },
    {
      key: "effort",
      label: "Esfuerzo B · M · A",
      sortable: false,
      render: item => <EffortSplit effort={toEffortCount(item.effort)} />,
      exportValue: item => `${item.effort.low} · ${item.effort.medium} · ${item.effort.high}`,
    },
    {
      key: "balance",
      label: "Equilibrio",
      align: "right",
      render: item => (
        <span className={isBalanced(item) ? "itineraries__balance" : "itineraries__balance itineraries__balance--bad"}>
          {item.criteria_met} de {item.criteria_total}
        </span>
      ),
      sortValue: item => item.criteria_met / item.criteria_total,
      exportValue: item => `${item.criteria_met} de ${item.criteria_total}`,
    },
    {
      key: "status",
      label: "Estado",
      render: item => <StatusPill status={itineraryStatus(item)} />,
      sortValue: item => STATUS_ORDER[listStatus(item)],
      exportValue: item => STATUS_LABEL[listStatus(item)],
    },
    {
      key: "action",
      label: "",
      sortable: false,
      render: item => (
        <Button
          variant="ghost"
          size="sm"
          onClick={event => {
            // The row opens it too; one navigation is enough
            event.stopPropagation();
            open(item);
          }}
        >
          {item.review ? REVIEW_LABEL[item.review] : "Ver"}
        </Button>
      ),
      exportValue: () => "",
    },
  ];

  return (
    <>
      <FilterBar summary={`${rows.length} itinerarios`} onReset={resetFilters}>
        <Field
          id="itineraries-package"
          label="Paquete"
          options={packageOptions(items, allPackagesLabel)}
          value={packageId}
          onChange={event => setPackageId(event.target.value)}
        />
        <Field
          id="itineraries-status"
          label="Estado"
          options={STATUS_OPTIONS}
          value={status}
          onChange={event => setStatus(event.target.value)}
        />
        <Field
          id="itineraries-query"
          label="Buscar"
          placeholder="ID, paquete o creador"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
      </FilterBar>

      <DataTable
        title={title}
        subtitle="Equilibrio: criterios de la parametrización cumplidos"
        columns={columns}
        rows={rows}
        defaultSort={{ key: "creation_date", dir: "desc" }}
        onRowClick={open}
        exportable
        emptyText="No hay itinerarios con estos filtros."
      />
    </>
  );
}
