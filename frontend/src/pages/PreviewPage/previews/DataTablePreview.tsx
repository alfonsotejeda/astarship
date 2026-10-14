import { useState } from "react";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { ItineraryStatus } from "@/components/StatusPill/StatusPill";
import { formatDate } from "@/lib/format";

type ItineraryRow = {
  id: string;
  creator: string;
  date: string;
  total: number;
  ratio: string;
  coverage: number;
  status: ItineraryStatus;
};

const STATUS_ORDER: Record<ItineraryStatus, number> = {
  generado: 1,
  revision: 2,
  rehacer: 3,
  aprobado: 4,
  asignado: 5,
};

const STATUS_LABEL: Record<ItineraryStatus, string> = {
  generado: "Generado",
  revision: "En revisión",
  rehacer: "Rehacer",
  aprobado: "Aprobado",
  asignado: "Asignado",
};

const ROWS: ItineraryRow[] = [
  { id: "IT-0142", creator: "Laura Pérez", date: "2026-10-08", total: 12, ratio: "5 / 4 / 3", coverage: 100, status: "aprobado" },
  { id: "IT-0139", creator: "Ernesto Díaz", date: "2026-10-05", total: 10, ratio: "6 / 2 / 2", coverage: 80, status: "rehacer" },
  { id: "IT-0151", creator: "Laura Pérez", date: "2026-10-10", total: 14, ratio: "6 / 5 / 3", coverage: 100, status: "revision" },
  { id: "IT-0128", creator: "Yanet Rodríguez", date: "2026-09-27", total: 8, ratio: "4 / 2 / 2", coverage: 60, status: "asignado" },
  { id: "IT-0155", creator: "Ernesto Díaz", date: "2026-10-11", total: 12, ratio: "4 / 4 / 4", coverage: 100, status: "generado" },
];

const COLUMNS: Column<ItineraryRow>[] = [
  { key: "id", label: "Itinerario" },
  { key: "creator", label: "Creador" },
  { key: "date", label: "Creado", render: row => formatDate(row.date), exportValue: row => formatDate(row.date) },
  { key: "total", label: "Activ.", align: "right" },
  { key: "ratio", label: "Visita / Exc. / Taller", align: "right", sortable: false },
  { key: "coverage", label: "Cobertura", align: "right", render: row => `${row.coverage} %`, exportValue: row => `${row.coverage} %` },
  {
    key: "status",
    label: "Estado",
    render: row => <StatusPill status={row.status} />,
    sortValue: row => STATUS_ORDER[row.status],
    exportValue: row => STATUS_LABEL[row.status],
  },
];

export function DataTablePreview() {
  const [selected, setSelected] = useState<string>();

  return (
    <>
      <section className="preview-section">
        <h2>Completa</h2>
        <DataTable
          title="Itinerarios generados"
          subtitle="Paquete La Habana colonial · 5 itinerarios (ejemplo)"
          columns={COLUMNS}
          rows={ROWS}
          defaultSort={{ key: "date", dir: "desc" }}
          exportable
          onRowClick={row => setSelected(row.id)}
          selectedKey={selected}
          footer={selected ? `Seleccionado: ${selected}` : "Pulsa una fila para seleccionarla"}
        />
      </section>

      <section className="preview-section">
        <h2>Vacía</h2>
        <DataTable title="Itinerarios generados" columns={COLUMNS} rows={[]} exportable />
      </section>

      <section className="preview-section">
        <h2>Bare</h2>
        <DataTable columns={COLUMNS.slice(0, 4)} rows={ROWS.slice(0, 3)} bare />
      </section>
    </>
  );
}
