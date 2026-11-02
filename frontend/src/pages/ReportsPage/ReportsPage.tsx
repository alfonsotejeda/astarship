import { Fragment } from "react";
import type { ComponentProps, ComponentType, ReactNode } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { Button } from "@/components/Button/Button";
import { ChartPanel } from "@/components/ChartPanel/ChartPanel";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column, SortState } from "@/components/DataTable/DataTable";
import { sortRows, toPdfRows } from "@/components/DataTable/rows";
import type { Cell } from "@/components/DataTable/rows";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { StatTile } from "@/components/StatTile/StatTile";
import { Tabs } from "@/components/Tabs/Tabs";
import { exportReportPdf } from "@/lib/pdf";
import "./ReportsPage.css";

const REPORTS = [
  {
    key: "rc1",
    tab: "Itinerarios generados",
    title: "Itinerarios generados",
    subtitle: "Generados automáticamente para un paquete, con su creador, fecha y parámetros.",
  },
  {
    key: "rc2",
    tab: "Más utilizadas",
    title: "Actividades más utilizadas",
    subtitle: "En los itinerarios finales de un paquete, por nivel de esfuerzo y categoría.",
  },
  {
    key: "rc3",
    tab: "Validaciones",
    title: "Validaciones por revisor",
    subtitle: "Itinerarios que validó un revisor, con la fecha y sus observaciones.",
  },
  {
    key: "rc4",
    tab: "Experiencia",
    title: "Experiencia en un itinerario",
    subtitle: "Satisfacción y abandono de los turistas, con las actividades clasificadas por esfuerzo.",
  },
  {
    key: "rc5",
    tab: "Comparar paquetes",
    title: "Comparar paquetes",
    subtitle: "Distribución de actividades por tipo, categoría y esfuerzo, y si se cumplieron los criterios de equilibrio.",
  },
  {
    key: "rc6",
    tab: "Esfuerzo y valoración",
    title: "Esfuerzo y valoración",
    subtitle: "Correlación por paquete, actividades con más abandono y turistas que pidieron modificación.",
  },
] as const;

export type ReportKey = (typeof REPORTS)[number]["key"];

const TABS = REPORTS.map(report => ({ key: report.key, label: report.tab }));

// Each query (#106–#111) adds its report here
const REPORT_VIEWS: Partial<Record<ReportKey, ComponentType>> = {};

function findReport(rc: string | undefined) {
  return REPORTS.find(report => report.key === rc);
}

export function ReportsPage() {
  const { rc } = useParams();
  const report = findReport(rc);

  if (!report) return <Navigate to="/reportes/rc1" replace />;

  const View = REPORT_VIEWS[report.key];
  // The key resets each report's filters when switching tabs
  return View ? <View key={report.key} /> : <PendingReport rc={report.key} />;
}

function ReportHeader({ rc, onExport }: { rc: ReportKey; onExport?: () => void }) {
  const navigate = useNavigate();
  const report = findReport(rc) ?? REPORTS[0];

  return (
    <>
      <PageHeader
        title={report.title}
        subtitle={report.subtitle}
        breadcrumbs={[{ label: "Reportes", to: "/reportes/rc1" }, { label: report.title }]}
        actions={
          <Button icon="download" disabled={!onExport} onClick={onExport}>
            Exportar reporte completo
          </Button>
        }
      />

      {/* Six tabs do not fit at phone width, so they scroll inside their row */}
      <div className="reports__tabs">
        <Tabs label="Reportes" items={TABS} value={rc} onChange={key => navigate(`/reportes/${key}`)} />
      </div>
    </>
  );
}

function PendingReport({ rc }: { rc: ReportKey }) {
  return (
    <>
      <ReportHeader rc={rc} />
      <Panel>
        <EmptyState icon="chart" title="Este reporte todavía no está disponible">
          Aún no está conectado con su consulta. Los demás reportes están en las otras pestañas.
        </EmptyState>
      </Panel>
    </>
  );
}

type PdfTable = { title: string; columns: string[]; rows: Cell[][] };

export type ReportTable = {
  title: string;
  node: ReactNode;
  pdf: PdfTable;
};

type ReportTableOptions<Row> = {
  title: string;
  subtitle?: string;
  columns: Column<Row>[];
  rows: Row[];
  defaultSort?: SortState;
  footer?: ReactNode;
  emptyText?: string;
};

// Builds the DataTable and its rows for the full export at once, so each table keeps its own row type
export function reportTable<Row>({ defaultSort, ...table }: ReportTableOptions<Row>): ReportTable {
  const sort = defaultSort ?? { key: null, dir: "asc" };

  return {
    title: table.title,
    node: <DataTable {...table} defaultSort={sort} exportable />,
    pdf: {
      title: table.title,
      columns: table.columns.map(column => column.label),
      rows: toPdfRows(sortRows(table.rows, table.columns, sort), table.columns),
    },
  };
}

type ReportTemplateProps = {
  rc: ReportKey;
  filters: ReactNode;
  summary?: string;
  onReset?: () => void;
  // Shown under the title of the full PDF
  filterLabel?: string;
  tiles: ComponentProps<typeof StatTile>[];
  charts: ComponentProps<typeof ChartPanel>[];
  tables: ReportTable[];
  isPending?: boolean;
  error?: Error | null;
  onRetry?: () => void;
};

// Template Reporte: FilterBar → StatTile → ChartPanel → DataTable
export function ReportTemplate({
  rc,
  filters,
  summary,
  onReset,
  filterLabel,
  tiles,
  charts,
  tables,
  isPending = false,
  error = null,
  onRetry,
}: ReportTemplateProps) {
  const report = findReport(rc) ?? REPORTS[0];
  const isReady = !isPending && !error;

  function handleExport() {
    exportReportPdf({ title: report.title, filter: filterLabel, tables: tables.map(table => table.pdf) });
  }

  let content: ReactNode;
  if (isPending) {
    content = (
      <>
        <div className="reports__stats" aria-busy="true">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton key={index} height={96} />
          ))}
        </div>
        <LoadingPanel rows={6} />
      </>
    );
  } else if (error) {
    content = <LoadError title="No se pudo cargar el reporte" error={error} onRetry={() => onRetry?.()} />;
  } else {
    content = (
      <>
        {tiles.length > 0 && (
          <div className="reports__stats">
            {tiles.map(tile => (
              <StatTile key={tile.label} {...tile} />
            ))}
          </div>
        )}

        {charts.length > 0 && (
          <div className="reports__charts">
            {charts.map(chart => (
              <ChartPanel key={chart.title} exportable {...chart} />
            ))}
          </div>
        )}

        {tables.map(table => (
          <Fragment key={table.title}>{table.node}</Fragment>
        ))}
      </>
    );
  }

  return (
    <>
      <ReportHeader rc={rc} onExport={isReady && tables.length > 0 ? handleExport : undefined} />

      <FilterBar summary={isReady ? summary : undefined} onReset={onReset}>
        {filters}
      </FilterBar>

      {content}
    </>
  );
}
