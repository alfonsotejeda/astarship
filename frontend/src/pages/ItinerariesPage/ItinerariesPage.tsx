import { useState } from "react";
import { Link, Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import type { Tone } from "@/components/Alert/tones";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { ChartPanel } from "@/components/ChartPanel/ChartPanel";
import { CriteriaCheck } from "@/components/CriteriaCheck/CriteriaCheck";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { EffortSplit } from "@/components/ItineraryCard/EffortSplit";
import { ItineraryCard } from "@/components/ItineraryCard/ItineraryCard";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { ReviewPanel } from "@/components/ReviewPanel/ReviewPanel";
import type { ReviewDecision as PanelDecision, ReviewResult } from "@/components/ReviewPanel/ReviewPanel";
import { RoutePanel } from "@/components/RoutePanel/RoutePanel";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import { toEffortLevel } from "@/lib/api/activities";
import { useActivityTypes } from "@/lib/api/catalogs";
import { ApiError } from "@/lib/api/client";
import { useItineraries, useItinerary, useMyReviews, useReviewItinerary } from "@/lib/api/itineraries";
import type {
  ItineraryDay,
  ItineraryDetail,
  ItineraryReview,
  ItinerarySummary,
  PackageHistoryItem,
  ReviewDecision,
} from "@/lib/api/itineraries";
import { formatDate, formatItineraryCode } from "@/lib/format";
import {
  EFFORT_LABEL,
  exportItinerary,
  guideOptions,
  isBalanced,
  ITINERARY_STATUS,
  itineraryStatus,
  listStatus,
  matchesSearch,
  packageOptions,
  proportionText,
  reviewQueue,
  STATUS_LABEL,
  STATUS_OPTIONS,
  STATUS_ORDER,
  toCriteria,
  toEffortCount,
} from "@/lib/itinerary";
import "./ItinerariesPage.css";

export function ItinerariesPage() {
  const { user } = useAuth();
  const { id } = useParams();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "guide" && user.role !== "manager") return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  if (id !== undefined) {
    const itineraryId = Number(id);
    if (!Number.isInteger(itineraryId)) return <Navigate to="/itinerarios" replace />;
    return <DetailView id={itineraryId} />;
  }

  return user.role === "manager" ? <ManagerList /> : <GuideList />;
}

const GUIDE_TITLES: Record<string, string> = {
  todos: "Todos los itinerarios",
  mios: "Mis itinerarios",
  otros: "Itinerarios de otros guías",
};

function GuideList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const itineraries = useItineraries();
  const tab = searchParams.get("tab") ?? "todos";

  const header = (
    <PageHeader
      title="Itinerarios"
      subtitle="De los paquetes en los que estás autorizado. Los de otros guías del mismo paquete los ves en solo lectura."
      actions={
        <Button variant="primary" icon="sparkles" onClick={() => navigate("/itinerarios/nuevo")}>
          Generar itinerario
        </Button>
      }
    />
  );

  if (itineraries.isPending) {
    return (
      <>
        {header}
        <LoadingPanel />
      </>
    );
  }

  if (itineraries.isError) {
    return (
      <>
        {header}
        <LoadError title="No se pudieron cargar los itinerarios" error={itineraries.error} onRetry={() => itineraries.refetch()} />
      </>
    );
  }

  const all = itineraries.data;
  const mine = all.filter(item => item.is_mine);
  const others = all.filter(item => !item.is_mine);
  const items = tab === "mios" ? mine : tab === "otros" ? others : all;

  return (
    <>
      {header}

      <Tabs
        label="Autor"
        items={[
          { key: "todos", label: "Todos", count: all.length },
          { key: "mios", label: "Míos", count: mine.length },
          { key: "otros", label: "De otros guías", count: others.length },
        ]}
        value={tab}
        onChange={key => setSearchParams({ tab: key }, { replace: true })}
      />

      <ItinerariesTable key={tab} items={items} title={GUIDE_TITLES[tab] ?? GUIDE_TITLES.todos} allPackagesLabel="Todos mis paquetes" />
    </>
  );
}

const MANAGER_SUBTITLES: Record<string, string> = {
  revisar: "Itinerarios validados por un guía y pendientes de tu aprobación. Los más antiguos primero.",
  todos: "Todos los itinerarios de los paquetes, en cualquier estado.",
};

function ManagerList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const itineraries = useItineraries();
  const tab = searchParams.get("tab") ?? "revisar";

  const queue = itineraries.data ? reviewQueue(itineraries.data) : [];

  const header = (
    <>
      <PageHeader
        title={tab === "todos" ? "Itinerarios" : "Por revisar"}
        subtitle={MANAGER_SUBTITLES[tab] ?? MANAGER_SUBTITLES.revisar}
      />
      <Tabs
        label="Vista"
        items={[
          { key: "revisar", label: "Por revisar", count: itineraries.data ? queue.length : undefined },
          { key: "todos", label: "Todos", count: itineraries.data?.length },
        ]}
        value={tab}
        onChange={key => setSearchParams({ tab: key }, { replace: true })}
      />
    </>
  );

  if (itineraries.isPending) {
    return (
      <>
        {header}
        <LoadingPanel />
      </>
    );
  }

  if (itineraries.isError) {
    return (
      <>
        {header}
        <LoadError title="No se pudieron cargar los itinerarios" error={itineraries.error} onRetry={() => itineraries.refetch()} />
      </>
    );
  }

  if (tab === "todos") {
    return (
      <>
        {header}
        <ItinerariesTable items={itineraries.data} title="Todos los itinerarios" allPackagesLabel="Todos" />
      </>
    );
  }

  return (
    <>
      {header}
      <ReviewQueue queue={queue} />
      <ReviewedTable />
    </>
  );
}

type ItinerariesTableProps = {
  items: ItinerarySummary[];
  title: string;
  allPackagesLabel: string;
};

const REVIEW_LABEL = { validate: "Validar", approve: "Revisar" };

function ItinerariesTable({ items, title, allPackagesLabel }: ItinerariesTableProps) {
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

const BALANCE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "ok", label: "Cumple todos" },
  { value: "bad", label: "Incumple alguno" },
];

function ReviewQueue({ queue }: { queue: ItinerarySummary[] }) {
  const navigate = useNavigate();
  const [packageId, setPackageId] = useState("");
  const [guideId, setGuideId] = useState("");
  const [balance, setBalance] = useState("");

  const visible = queue.filter(
    item =>
      (!packageId || String(item.package_id) === packageId) &&
      (!guideId || String(item.guide_id) === guideId) &&
      (!balance || isBalanced(item) === (balance === "ok")),
  );

  function resetFilters() {
    setPackageId("");
    setGuideId("");
    setBalance("");
  }

  return (
    <>
      <FilterBar summary={`${visible.length} pendientes`} onReset={resetFilters}>
        <Field
          id="queue-package"
          label="Paquete"
          options={packageOptions(queue, "Todos")}
          value={packageId}
          onChange={event => setPackageId(event.target.value)}
        />
        <Field
          id="queue-guide"
          label="Creador"
          options={guideOptions(queue)}
          value={guideId}
          onChange={event => setGuideId(event.target.value)}
        />
        <Field
          id="queue-balance"
          label="Equilibrio"
          options={BALANCE_OPTIONS}
          value={balance}
          onChange={event => setBalance(event.target.value)}
        />
      </FilterBar>

      {queue.length === 0 && (
        <Panel>
          <EmptyState icon="check-circle" title="No tienes itinerarios por revisar">
            Cuando un guía valide un itinerario de tus paquetes aparecerá aquí.
          </EmptyState>
        </Panel>
      )}

      {queue.length > 0 && visible.length === 0 && (
        <Panel>
          <EmptyState
            title="Ningún itinerario coincide con los filtros"
            action={
              <Button size="sm" onClick={resetFilters}>
                Quitar filtros
              </Button>
            }
          />
        </Panel>
      )}

      {visible.length > 0 && (
        <div className="itineraries__queue">
          {visible.map(item => (
            <ItineraryCard
              key={item.id}
              itinerary={{
                id: formatItineraryCode(item.id),
                package: item.package_name,
                status: itineraryStatus(item),
                creator: item.guide_name,
                date: formatDate(item.submitted_date ?? item.creation_date),
                days: item.days,
                activities: item.activity_count,
                effort: toEffortCount(item.effort),
                params: proportionText(item.proportion_types),
              }}
              actions={
                <div className="itineraries__card-actions">
                  <span className={isBalanced(item) ? "itineraries__balance" : "itineraries__balance itineraries__balance--bad"}>
                    Cumple {item.criteria_met} de {item.criteria_total} criterios
                  </span>
                  <Button variant="primary" size="sm" onClick={() => navigate(`/itinerarios/${item.id}`)}>
                    Revisar
                  </Button>
                </div>
              }
            />
          ))}
        </div>
      )}
    </>
  );
}

const REVIEWED_DAYS = 30;

type ReviewRow = ItineraryReview & { key: string };

const REVIEWED_COLUMNS: Column<ReviewRow>[] = [
  {
    key: "itinerary_id",
    label: "Itinerario",
    render: row => <span className="itineraries__code">{formatItineraryCode(row.itinerary_id)}</span>,
    exportValue: row => formatItineraryCode(row.itinerary_id),
  },
  { key: "package_name", label: "Paquete" },
  { key: "guide_name", label: "Creador" },
  {
    key: "review_date",
    label: "Revisado",
    render: row => <span className="itineraries__mono">{formatDate(row.review_date)}</span>,
    exportValue: row => formatDate(row.review_date),
  },
  {
    key: "result",
    label: "Resultado",
    render: row => <StatusPill status={ITINERARY_STATUS[row.result]} />,
    exportValue: row => STATUS_LABEL[row.result],
  },
  {
    key: "observations",
    label: "Observaciones",
    sortable: false,
    render: row => <span className="itineraries__muted">{row.observations || "—"}</span>,
    exportValue: row => row.observations ?? "",
  },
];

function ReviewedTable() {
  const navigate = useNavigate();
  const reviews = useMyReviews(REVIEWED_DAYS);

  if (reviews.isPending) return <LoadingPanel rows={3} />;
  if (reviews.isError) {
    return <LoadError title="No se pudieron cargar tus revisiones" error={reviews.error} onRetry={() => reviews.refetch()} />;
  }

  const rows = reviews.data.map(review => ({ ...review, key: `${review.itinerary_id}-${review.review_date}` }));

  return (
    <DataTable
      title="Revisados por ti"
      subtitle={`Últimos ${REVIEWED_DAYS} días`}
      columns={REVIEWED_COLUMNS}
      rows={rows}
      rowKey="key"
      defaultSort={{ key: "review_date", dir: "desc" }}
      onRowClick={row => navigate(`/itinerarios/${row.itinerary_id}`)}
      exportable
      emptyText={`No has revisado itinerarios en los últimos ${REVIEWED_DAYS} días.`}
    />
  );
}

type ToastMessage = { tone: Tone; text: string };

const DECISION: Record<PanelDecision, ReviewDecision> = { aprobar: "approve", rechazar: "reject", rehacer: "redo" };

function reviewMessage(itinerary: ItineraryDetail, decision: ReviewDecision) {
  const code = formatItineraryCode(itinerary.id);
  if (decision === "reject") return `Rechazaste ${code}.`;
  if (decision === "redo") return `Pediste otro itinerario en lugar de ${code}.`;
  return itinerary.review === "validate" ? `Validaste ${code}. Pasa al jefe de operaciones.` : `Aprobaste ${code}.`;
}

function DetailView({ id }: { id: number }) {
  const navigate = useNavigate();
  const itinerary = useItinerary(id);
  const itineraries = useItineraries();
  const activityTypes = useActivityTypes();
  const review = useReviewItinerary(id);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const code = formatItineraryCode(id);
  const breadcrumbs = [{ label: "Itinerarios", to: "/itinerarios" }, { label: code }];

  const toastElement = toast && (
    <div className="itineraries__toast">
      <Toast tone={toast.tone} onClose={() => setToast(null)}>
        {toast.text}
      </Toast>
    </div>
  );

  if (itinerary.isPending) {
    return (
      <>
        <PageHeader title={code} breadcrumbs={breadcrumbs} />
        <LoadingPanel rows={8} />
      </>
    );
  }

  if (itinerary.isError) {
    const notFound = itinerary.error instanceof ApiError && itinerary.error.status === 404;
    return (
      <>
        <PageHeader title={code} breadcrumbs={breadcrumbs} />
        {notFound ? (
          <Panel>
            <EmptyState
              icon="route"
              title="Este itinerario no existe o no puedes verlo"
              action={<Button onClick={() => navigate("/itinerarios")}>Volver a itinerarios</Button>}
            />
          </Panel>
        ) : (
          <LoadError title="No se pudo cargar el itinerario" error={itinerary.error} onRetry={() => itinerary.refetch()} />
        )}
        {toastElement}
      </>
    );
  }

  const data = itinerary.data;
  const types = activityTypes.data?.map(type => ({ code: type.code, label: type.name })) ?? [];

  // Previous and next within the current user's review queue
  const queue = reviewQueue(itineraries.data ?? []);
  const index = queue.findIndex(item => item.id === id);
  const previous = index > 0 ? queue[index - 1] : undefined;
  const next = index >= 0 ? queue[index + 1] : undefined;

  function handleReview(result: ReviewResult) {
    if (review.isPending) return;
    const decision = DECISION[result.decision];
    // Read before submitting: once reviewed, this itinerary leaves the queue
    const upcoming = next;

    review.mutate(
      { result: decision, observations: result.observations },
      {
        onSuccess: () => {
          setToast({ tone: "ok", text: reviewMessage(data, decision) });
          if (upcoming) navigate(`/itinerarios/${upcoming.id}`);
        },
        onError: error => setToast({ tone: "bad", text: `No se pudo registrar la revisión: ${error.message}` }),
      },
    );
  }

  return (
    <>
      <PageHeader
        title={`${code} · ${data.package_name}`}
        subtitle={`Generado por ${data.guide_name} · ${formatDate(data.generated_at)} · ${data.days.length} días · ${data.activity_count} actividades`}
        breadcrumbs={breadcrumbs}
        status={
          <>
            <StatusPill status={itineraryStatus(data)} />
            {data.replaces_id !== null && <Badge>Sustituye a {formatItineraryCode(data.replaces_id)}</Badge>}
          </>
        }
        actions={
          <>
            {index >= 0 && (
              <>
                <Button variant="ghost" disabled={!previous} onClick={() => previous && navigate(`/itinerarios/${previous.id}`)}>
                  Anterior
                </Button>
                <Button variant="ghost" disabled={!next} onClick={() => next && navigate(`/itinerarios/${next.id}`)}>
                  Siguiente ({queue.length - index - 1})
                </Button>
              </>
            )}
            <Button icon="download" onClick={() => exportItinerary(data, types)}>
              Exportar PDF
            </Button>
          </>
        }
      />

      <div className="itineraries__columns">
        <div className="itineraries__main">
          <ParamsPanel itinerary={data} />
          <RoutePanel key={data.id} days={data.days} />
          <EffortChart days={data.days} />
        </div>

        <div className="itineraries__side">
          <Panel>
            <CriteriaCheck items={toCriteria(data.criteria)} />
          </Panel>

          {data.review && (
            <ReviewPanel key={data.id} id={`review-${data.id}`} onSubmit={handleReview}>
              {data.review === "validate" && (
                <Alert tone="info">Validas como guía: si lo apruebas, pasa al jefe de operaciones.</Alert>
              )}
            </ReviewPanel>
          )}

          <HistoryPanel history={data.history} />
        </div>
      </div>

      {toastElement}
    </>
  );
}

function ParamsPanel({ itinerary }: { itinerary: ItineraryDetail }) {
  const params = [
    { key: "Proporción", value: proportionText(itinerary.proportion_types) },
    { key: "Total", value: `${itinerary.activity_count} actividades` },
    { key: "Días", value: String(itinerary.days.length) },
    { key: "Esfuerzo alto", value: itinerary.avoid_late_high_effort ? "Evitar tras 17:00" : "Sin límite" },
  ];

  return (
    <Panel title="Parámetros usados" subtitle={`Los fijó ${itinerary.guide_name} al generar.`}>
      <dl className="itineraries__params">
        {params.map(param => (
          <div key={param.key} className="itineraries__param">
            <dt className="itineraries__eyebrow">{param.key}</dt>
            <dd className="itineraries__param-value">{param.value}</dd>
          </div>
        ))}
      </dl>

      <div className="itineraries__categories">
        <span className="itineraries__muted">Categorías del paquete:</span>
        {itinerary.package_categories.map(category => (
          <Badge key={category} tone="category">
            {category}
          </Badge>
        ))}
      </div>
    </Panel>
  );
}

const EFFORT_SERIES = [
  { key: "bajo", label: EFFORT_LABEL.bajo, color: "effort-low" },
  { key: "medio", label: EFFORT_LABEL.medio, color: "effort-medium" },
  { key: "alto", label: EFFORT_LABEL.alto, color: "effort-high" },
];

function EffortChart({ days }: { days: ItineraryDay[] }) {
  const data = days.map(day => {
    const counts = { day: `Día ${day.day}`, bajo: 0, medio: 0, alto: 0 };
    day.stops.forEach(stop => counts[toEffortLevel(stop.effort_level)]++);
    return counts;
  });

  return (
    <ChartPanel
      title="Esfuerzo por día"
      subtitle="Número de actividades por nivel de esfuerzo"
      kind="stacked"
      xKey="day"
      xLabel="Día"
      data={data}
      series={EFFORT_SERIES}
      exportable
    />
  );
}

function HistoryPanel({ history }: { history: PackageHistoryItem[] }) {
  return (
    <Panel title="Historial del paquete">
      {history.length === 0 && <p className="itineraries__muted">Es el primer itinerario de este paquete.</p>}

      {history.length > 0 && (
        <ul className="itineraries__history">
          {history.map(item => (
            <li key={item.itinerary_id} className="itineraries__history-item">
              <div className="itineraries__history-head">
                <Link to={`/itinerarios/${item.itinerary_id}`} className="itineraries__history-link">
                  {formatItineraryCode(item.itinerary_id)} · {formatDate(item.date)}
                </Link>
                <StatusPill status={itineraryStatus(item)} />
              </div>
              <span className="itineraries__muted">
                {item.observations ? `«${item.observations}»` : "Sin observaciones."}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
