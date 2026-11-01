import { useState } from "react";
import { Badge } from "@/components/Badge/Badge";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { Category } from "@/lib/api/catalogs";
import type { Package } from "@/lib/api/packages";
import { matchesSearch, permissionLabels, STATUS_OPTIONS, STATUS_ORDER, STATUS_PILL } from "../lib/package";

type PackagesTableProps = {
  packages: Package[];
  categories: Category[];
  isAdmin: boolean;
  defaultSortKey: string;
  selectedId?: number;
  onSelect: (pkg: Package) => void;
};

const SHOWN_CATEGORIES = 3;

export function PackagesTable({ packages, categories, isAdmin, defaultSortKey, selectedId, onSelect }: PackagesTableProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");

  const rows = packages.filter(
    pkg =>
      matchesSearch(pkg, query) &&
      (!categoryId || pkg.categories.some(category => String(category.id) === categoryId)) &&
      (!status || pkg.status === status),
  );

  function resetFilters() {
    setQuery("");
    setCategoryId("");
    setStatus("");
  }

  // The admin sees how many people hold permissions; the rest, their own permissions
  const accessColumn: Column<Package> = isAdmin
    ? {
        key: "people",
        label: "Personas",
        align: "right",
        render: pkg => pkg.people.length,
        sortValue: pkg => pkg.people.length,
        exportValue: pkg => pkg.people.length,
      }
    : {
        key: "my_permissions",
        label: "Tus permisos",
        sortable: false,
        render: pkg => (
          <span className="packages__badges">
            {permissionLabels(pkg.my_permissions).map(label => (
              <Badge key={label}>{label}</Badge>
            ))}
          </span>
        ),
        exportValue: pkg => permissionLabels(pkg.my_permissions).join(", "),
      };

  const columns: Column<Package>[] = [
    {
      key: "name",
      label: "Paquete",
      render: pkg => (
        <span className="packages__name">
          <span className="packages__name-title">{pkg.name}</span>
          <span className="packages__muted">{pkg.destination}</span>
        </span>
      ),
      exportValue: pkg => `${pkg.name} (${pkg.destination})`,
    },
    {
      key: "categories",
      label: "Categorías",
      sortable: false,
      render: pkg => (
        <span className="packages__badges">
          {pkg.categories.slice(0, SHOWN_CATEGORIES).map(category => (
            <Badge key={category.id} tone="category">
              {category.name}
            </Badge>
          ))}
          {pkg.categories.length > SHOWN_CATEGORIES && <Badge>+{pkg.categories.length - SHOWN_CATEGORIES}</Badge>}
        </span>
      ),
      exportValue: pkg => pkg.categories.map(category => category.name).join(", "),
    },
    accessColumn,
    {
      key: "approved_itineraries",
      label: "Itin. aprobados",
      align: "right",
      render: pkg => (
        <span className="packages__mono">
          {pkg.approved_itineraries} / {pkg.total_itineraries}
        </span>
      ),
      exportValue: pkg => `${pkg.approved_itineraries} / ${pkg.total_itineraries}`,
    },
    {
      key: "enrolled",
      label: "Inscritos",
      align: "right",
      render: pkg => <span className="packages__mono">{pkg.enrolled}</span>,
    },
    {
      key: "status",
      label: "Estado",
      render: pkg => <StatusPill status={STATUS_PILL[pkg.status].status}>{STATUS_PILL[pkg.status].label}</StatusPill>,
      sortValue: pkg => STATUS_ORDER[pkg.status],
      exportValue: pkg => STATUS_PILL[pkg.status].label,
    },
  ];

  return (
    <>
      <FilterBar summary={`${rows.length} paquetes`} onReset={resetFilters}>
        <Field
          id="packages-query"
          label="Buscar"
          placeholder="Nombre o destino"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Field
          id="packages-category"
          label="Categoría"
          options={[
            { value: "", label: "Todas" },
            ...categories.map(category => ({ value: String(category.id), label: category.name })),
          ]}
          value={categoryId}
          onChange={event => setCategoryId(event.target.value)}
        />
        <Field
          id="packages-status"
          label="Estado"
          options={STATUS_OPTIONS}
          value={status}
          onChange={event => setStatus(event.target.value)}
        />
      </FilterBar>

      <DataTable
        title="Paquetes"
        subtitle={isAdmin ? "Todos" : "Con algún permiso tuyo"}
        columns={columns}
        rows={rows}
        defaultSort={{ key: defaultSortKey, dir: "asc" }}
        onRowClick={onSelect}
        selectedKey={selectedId}
        exportable
        footer="Pulsa una fila para ver el paquete."
        emptyText="No hay paquetes con estos filtros."
      />
    </>
  );
}
