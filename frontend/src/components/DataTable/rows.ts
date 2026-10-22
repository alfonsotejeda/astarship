import type { Column, SortState } from "./DataTable";

export type Cell = string | number;

export function cellValue<Row>(row: Row, key: string): Cell | undefined {
  const value = (row as Record<string, unknown>)[key];
  return typeof value === "string" || typeof value === "number" ? value : undefined;
}

function compare(a: Cell | null | undefined, b: Cell | null | undefined) {
  if (a == null) return b == null ? 0 : 1;
  if (b == null) return -1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b), "es", { numeric: true, sensitivity: "base" });
}

export function sortRows<Row>(rows: Row[], columns: Column<Row>[], sort: SortState): Row[] {
  const column = columns.find(item => item.key === sort.key);
  if (!column) return rows;

  const getValue = column.sortValue ?? ((row: Row) => cellValue(row, column.key));
  const direction = sort.dir === "desc" ? -1 : 1;
  return [...rows].sort((a, b) => direction * compare(getValue(a), getValue(b)));
}

// The PDF only takes text: components in cells are replaced by exportValue, or by the raw value
export function toPdfRows<Row>(rows: Row[], columns: Column<Row>[]): Cell[][] {
  return rows.map(row => columns.map(column => column.exportValue?.(row) ?? cellValue(row, column.key) ?? ""));
}
