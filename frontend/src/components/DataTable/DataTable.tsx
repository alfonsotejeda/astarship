import { useMemo, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { Button } from "@/components/Button/Button";
import { exportPdf } from "@/lib/pdf";
import { cellValue, sortRows, toPdfRows } from "./rows";
import type { Cell } from "./rows";
import "./DataTable.css";

export type Column<Row> = {
  key: string;
  label: string;
  align?: "left" | "right";
  sortable?: boolean;
  render?: (row: Row) => ReactNode;
  // For cells that show a component (StatusPill, EffortMeter): sort and export by the data, not the markup
  sortValue?: (row: Row) => Cell | null | undefined;
  exportValue?: (row: Row) => Cell;
};

export type SortState = {
  key: string | null;
  dir: "asc" | "desc";
};

type DataTableProps<Row> = {
  columns: Column<Row>[];
  rows: Row[];
  rowKey?: keyof Row;
  title?: string;
  subtitle?: string;
  caption?: string;
  defaultSort?: SortState;
  sort?: SortState;
  onSortChange?: (sort: SortState) => void;
  exportable?: boolean;
  onRowClick?: (row: Row) => void;
  selectedKey?: Cell;
  actions?: ReactNode;
  footer?: ReactNode;
  emptyText?: string;
  bare?: boolean;
  className?: string;
};

function SortIcon({ dir }: { dir: SortState["dir"] | null }) {
  return (
    <svg className="data-table__sort-icon" viewBox="0 0 10 12" aria-hidden="true">
      <path d="M5 0 L9 4.5 H1 Z" fill="currentColor" opacity={dir === "asc" ? 1 : 0.35} />
      <path d="M5 12 L1 7.5 H9 Z" fill="currentColor" opacity={dir === "desc" ? 1 : 0.35} />
    </svg>
  );
}

export function DataTable<Row>({
  columns,
  rows,
  rowKey = "id" as keyof Row,
  title,
  subtitle,
  caption,
  defaultSort = { key: null, dir: "asc" },
  sort: controlledSort,
  onSortChange,
  exportable = false,
  onRowClick,
  selectedKey,
  actions,
  footer,
  emptyText = "No hay resultados con estos filtros.",
  bare = false,
  className,
}: DataTableProps<Row>) {
  const [uncontrolledSort, setUncontrolledSort] = useState(defaultSort);
  const sort = controlledSort ?? uncontrolledSort;

  const sortedRows = useMemo(() => sortRows(rows, columns, sort), [columns, rows, sort]);

  function toggleSort(key: string) {
    const dir = sort.key === key && sort.dir === "asc" ? "desc" : "asc";
    if (!controlledSort) setUncontrolledSort({ key, dir });
    onSortChange?.({ key, dir });
  }

  function handleExport() {
    exportPdf({
      title: title ?? "Tabla",
      filter: subtitle,
      columns: columns.map(column => column.label),
      rows: toPdfRows(sortedRows, columns),
    });
  }

  function handleRowKeyDown(event: KeyboardEvent, row: Row) {
    if (event.key !== "Enter" && event.key !== " ") return;
    event.preventDefault();
    onRowClick?.(row);
  }

  const header = (
    <tr>
      {columns.map(column => {
        const isSortable = column.sortable !== false;
        const isActive = sort.key === column.key;
        const alignClass = column.align === "right" ? "data-table__cell--right" : undefined;

        let ariaSort: "ascending" | "descending" | "none" | undefined;
        if (isActive) ariaSort = sort.dir === "asc" ? "ascending" : "descending";
        else if (isSortable) ariaSort = "none";

        return (
          <th key={column.key} scope="col" aria-sort={ariaSort} className={alignClass}>
            {isSortable ? (
              <button
                type="button"
                className="data-table__sort"
                data-active={isActive}
                onClick={() => toggleSort(column.key)}
              >
                {column.label}
                <SortIcon dir={isActive ? sort.dir : null} />
              </button>
            ) : (
              <span className="data-table__heading">{column.label}</span>
            )}
          </th>
        );
      })}
    </tr>
  );

  const body = sortedRows.length ? (
    sortedRows.map((row, index) => {
      const key = cellValue(row, String(rowKey)) ?? index;
      const isSelected = selectedKey !== undefined && key === selectedKey;
      const rowClasses = [onRowClick && "data-table__row--clickable", isSelected && "data-table__row--selected"]
        .filter(Boolean)
        .join(" ");

      return (
        <tr
          key={key}
          className={rowClasses || undefined}
          aria-current={isSelected || undefined}
          tabIndex={onRowClick ? 0 : undefined}
          onClick={onRowClick ? () => onRowClick(row) : undefined}
          onKeyDown={onRowClick ? event => handleRowKeyDown(event, row) : undefined}
        >
          {columns.map(column => (
            <td key={column.key} className={column.align === "right" ? "data-table__cell--right" : undefined}>
              {column.render ? column.render(row) : cellValue(row, column.key)}
            </td>
          ))}
        </tr>
      );
    })
  ) : (
    <tr>
      <td colSpan={columns.length} className="data-table__empty">
        {emptyText}
      </td>
    </tr>
  );

  // The table scrolls sideways inside its container, never the page
  const table = (
    <div className="data-table__scroll">
      <table className="data-table__table">
        {caption && <caption className="data-table__caption">{caption}</caption>}
        <thead>{header}</thead>
        <tbody>{body}</tbody>
      </table>
    </div>
  );

  if (bare) return table;

  const hasBar = title || actions || exportable;
  const classes = ["data-table", className].filter(Boolean).join(" ");

  return (
    <section className={classes}>
      {hasBar && (
        <div className="data-table__bar">
          <div>
            {title && <h3 className="data-table__title">{title}</h3>}
            {subtitle && <p className="data-table__subtitle">{subtitle}</p>}
          </div>
          <div className="data-table__actions">
            {actions}
            {exportable && (
              <Button size="sm" icon="download" onClick={handleExport}>
                Exportar PDF
              </Button>
            )}
          </div>
        </div>
      )}

      {table}

      {footer && <div className="data-table__footer">{footer}</div>}
    </section>
  );
}
