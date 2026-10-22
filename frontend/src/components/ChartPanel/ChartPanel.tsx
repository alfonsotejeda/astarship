import { useState } from "react";
import type { ReactNode } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipContentProps } from "recharts";
import { Button } from "@/components/Button/Button";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column, SortState } from "@/components/DataTable/DataTable";
import { sortRows, toPdfRows } from "@/components/DataTable/rows";
import { Panel } from "@/components/Panel/Panel";
import { Tabs } from "@/components/Tabs/Tabs";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { exportPdf } from "@/lib/pdf";
import "./ChartPanel.css";

export type ChartSeries = {
  key: string;
  label: string;
  // A color token name (effort-low, destination, route…), never a hex
  color: string;
};

export type ChartDatum = Record<string, string | number | boolean | undefined>;

type Point = { x: number; y: number };

type ChartPanelProps = {
  title: string;
  subtitle?: string;
  kind: "stacked" | "grouped" | "scatter";
  // Bars: one object per x category with a value per series key. Scatter: { x, y, series?, name?, highlight? }
  data: ChartDatum[];
  series: ChartSeries[];
  xKey?: string;
  xLabel?: string;
  yLabel?: string;
  yMax?: number;
  yFormat?: (value: number) => string;
  xDomain?: [number, number];
  yDomain?: [number, number];
  xTicks?: { value: number; label: string }[];
  trend?: [Point, Point];
  tableColumns?: Column<ChartDatum>[];
  tableRows?: ChartDatum[];
  footnote?: string;
  exportable?: boolean;
  className?: string;
};

const VIEWS = [
  { key: "chart", label: "Gráfico" },
  { key: "table", label: "Tabla" },
];

const CHART_HEIGHT = 260;
const TICK = { fill: "var(--ink-muted)", fontSize: 12 };
const AXIS_LINE = { stroke: "var(--line-strong)" };

const tokenColor = (series: ChartSeries) => `var(--${series.color})`;

function defaultFormat(value: number) {
  return value.toLocaleString("es-ES", { maximumFractionDigits: 1 });
}

function Legend({ series, round }: { series: ChartSeries[]; round: boolean }) {
  return (
    <ul className="chart-panel__legend">
      {series.map(item => (
        <li key={item.key} className="chart-panel__legend-item">
          <span
            className={round ? "chart-panel__swatch chart-panel__swatch--round" : "chart-panel__swatch"}
            style={{ background: tokenColor(item) }}
          />
          {item.label}
        </li>
      ))}
    </ul>
  );
}

type ChartTooltipProps = Partial<TooltipContentProps> & {
  kind: ChartPanelProps["kind"];
  format: (value: number) => string;
  xLabel?: string;
  yLabel?: string;
};

// Values and labels in ink; the swatch next to them carries the series color
function ChartTooltip({ active, payload, label, kind, format, xLabel, yLabel }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  if (kind === "scatter") {
    const point = payload[0].payload as ChartDatum;
    return (
      <div className="chart-panel__tooltip">
        {point.name && <div className="chart-panel__tooltip-title">{point.name}</div>}
        <div className="chart-panel__tooltip-row">
          <span>{xLabel ?? "X"}</span>
          <span className="chart-panel__tooltip-value">{format(Number(point.x))}</span>
        </div>
        <div className="chart-panel__tooltip-row">
          <span>{yLabel ?? "Y"}</span>
          <span className="chart-panel__tooltip-value">{format(Number(point.y))}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="chart-panel__tooltip">
      <div className="chart-panel__tooltip-title">{label}</div>
      {payload.map(entry => (
        <div key={String(entry.dataKey)} className="chart-panel__tooltip-row">
          <span className="chart-panel__swatch" style={{ background: entry.color }} />
          <span>{entry.name}</span>
          <span className="chart-panel__tooltip-value">{format(Number(entry.value))}</span>
        </div>
      ))}
    </div>
  );
}

export function ChartPanel({
  title,
  subtitle,
  kind,
  data,
  series,
  xKey = "label",
  xLabel,
  yLabel,
  yMax,
  yFormat = defaultFormat,
  xDomain,
  yDomain,
  xTicks,
  trend,
  tableColumns,
  tableRows,
  footnote,
  exportable = false,
  className,
}: ChartPanelProps) {
  const [view, setView] = useState("chart");
  const [sort, setSort] = useState<SortState>({ key: null, dir: "asc" });
  const reducedMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const columns: Column<ChartDatum>[] =
    tableColumns ??
    (kind === "scatter"
      ? [
          { key: "name", label: "Elemento" },
          { key: "x", label: xLabel ?? "X", align: "right" },
          { key: "y", label: yLabel ?? "Y", align: "right" },
        ]
      : [
          { key: xKey, label: xLabel ?? "Elemento" },
          ...series.map(item => ({ key: item.key, label: item.label, align: "right" as const })),
        ]);
  const rows = tableRows ?? data.map((datum, index) => ({ id: index, ...datum }));

  // The PDF follows the table's current order, even when exporting from the chart view
  function handleExport() {
    exportPdf({
      title,
      filter: subtitle,
      columns: columns.map(column => column.label),
      rows: toPdfRows(sortRows(rows, columns, sort), columns),
    });
  }

  const tooltip = (
    <Tooltip
      cursor={kind === "scatter" ? { stroke: "var(--line-strong)", strokeDasharray: "4 4" } : { fill: "var(--surface-sunken)" }}
      content={props => <ChartTooltip {...props} kind={kind} format={yFormat} xLabel={xLabel} yLabel={yLabel} />}
      isAnimationActive={false}
    />
  );

  const yAxisLabel = yLabel
    ? { value: yLabel, angle: -90, position: "insideLeft" as const, style: { ...TICK, textAnchor: "middle" as const } }
    : undefined;

  let chart: ReactNode;
  if (kind === "scatter") {
    const fallbackSeries = series[0]?.key;
    chart = (
      <ScatterChart margin={{ top: 8, right: 16, bottom: 4, left: 4 }}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis
          type="number"
          dataKey="x"
          name={xLabel}
          domain={xDomain ?? ["auto", "auto"]}
          ticks={xTicks?.map(tick => tick.value)}
          tickFormatter={value => xTicks?.find(tick => tick.value === value)?.label ?? yFormat(value)}
          tick={TICK}
          axisLine={AXIS_LINE}
          tickLine={false}
        />
        <YAxis
          type="number"
          dataKey="y"
          name={yLabel}
          domain={yDomain ?? [0, 5]}
          tickFormatter={yFormat}
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={44}
          label={yAxisLabel}
        />
        {tooltip}
        {series.map(item => (
          <Scatter
            key={item.key}
            name={item.label}
            data={data.filter(point => (point.series ?? fallbackSeries) === item.key)}
            fill={tokenColor(item)}
            isAnimationActive={!reducedMotion}
            shape={({ cx, cy, payload }: { cx?: number; cy?: number; payload?: ChartDatum }) => (
              <circle
                cx={cx}
                cy={cy}
                r={payload?.highlight ? 6 : 4.5}
                fill={tokenColor(item)}
                className={payload?.highlight ? "chart-panel__dot chart-panel__dot--highlight" : "chart-panel__dot"}
              />
            )}
          />
        ))}
        {trend && (
          <ReferenceLine
            segment={trend}
            stroke="var(--ink-muted)"
            strokeWidth={1.5}
            strokeDasharray="5 4"
            ifOverflow="extendDomain"
          />
        )}
      </ScatterChart>
    );
  } else {
    const stacked = kind === "stacked";
    chart = (
      <BarChart data={data} margin={{ top: 8, right: 16, bottom: 4, left: 4 }} barGap={2}>
        <CartesianGrid stroke="var(--line)" vertical={false} />
        <XAxis dataKey={xKey} tick={TICK} axisLine={AXIS_LINE} tickLine={false} />
        <YAxis
          domain={[0, yMax ?? "auto"]}
          tickFormatter={yFormat}
          tick={TICK}
          axisLine={false}
          tickLine={false}
          width={44}
          label={yAxisLabel}
        />
        {tooltip}
        {series.map(item => (
          <Bar
            key={item.key}
            dataKey={item.key}
            name={item.label}
            stackId={stacked ? "stack" : undefined}
            fill={tokenColor(item)}
            // The surface-colored stroke leaves a 2px gap between stacked segments
            stroke={stacked ? "var(--surface-raised)" : undefined}
            strokeWidth={stacked ? 2 : 0}
            radius={stacked ? 2 : [4, 4, 0, 0]}
            maxBarSize={stacked ? 56 : 28}
            isAnimationActive={!reducedMotion}
          />
        ))}
      </BarChart>
    );
  }

  const actions = (
    <>
      <Tabs variant="segmented" label="Vista" items={VIEWS} value={view} onChange={setView} />
      {exportable && (
        <Button size="sm" icon="download" onClick={handleExport}>
          Exportar PDF
        </Button>
      )}
    </>
  );

  return (
    <Panel
      title={title}
      subtitle={subtitle}
      actions={actions}
      flush={view === "table"}
      className={["chart-panel", className].filter(Boolean).join(" ")}
    >
      {view === "chart" ? (
        <>
          <Legend series={series} round={kind === "scatter"} />
          <div className="chart-panel__chart">
            <ResponsiveContainer width="100%" height={CHART_HEIGHT}>
              {chart}
            </ResponsiveContainer>
          </div>
          {footnote && <p className="chart-panel__footnote">{footnote}</p>}
        </>
      ) : (
        <DataTable columns={columns} rows={rows} sort={sort} onSortChange={setSort} bare />
      )}
    </Panel>
  );
}
