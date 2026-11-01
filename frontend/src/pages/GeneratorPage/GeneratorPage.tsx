import { useState } from "react";
import type { UseQueryResult } from "@tanstack/react-query";
import { Navigate } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { ActivityRow } from "@/components/ActivityRow/ActivityRow";
import { Alert } from "@/components/Alert/Alert";
import type { Tone } from "@/components/Alert/tones";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { ChipSelect } from "@/components/ChipSelect/ChipSelect";
import { CriteriaCheck } from "@/components/CriteriaCheck/CriteriaCheck";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { EffortSplit } from "@/components/ItineraryCard/EffortSplit";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { ProportionInput } from "@/components/ProportionInput/ProportionInput";
import { RoutePanel } from "@/components/RoutePanel/RoutePanel";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Toast } from "@/components/Toast/Toast";
import { toRowActivity } from "@/lib/activity";
import { toEffortLevel, usePackageActivities } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import { useActivityTypes, useCategories } from "@/lib/api/catalogs";
import type { Category } from "@/lib/api/catalogs";
import { useGenerateItinerary, useSubmitItinerary } from "@/lib/api/itineraries";
import type { GenerateItineraryRequest, ItineraryDetail } from "@/lib/api/itineraries";
import { usePackages } from "@/lib/api/packages";
import type { Package } from "@/lib/api/packages";
import { formatDate, formatItineraryCode, formatTime, isToday } from "@/lib/format";
import { initialForm, loadDraft, MAX_TOTAL, MIN_TOTAL, saveDraft, toTypeOptions, validate } from "@/lib/generator";
import type { FormValidity, GeneratorForm, TypeOption } from "@/lib/generator";
import { exportItinerary, itineraryStatus, toCriteria } from "@/lib/itinerary";
import "./GeneratorPage.css";

const BREADCRUMBS = [{ label: "Itinerarios", to: "/itinerarios" }, { label: "Nuevo" }];

const SUBTITLE =
  "Elige el paquete, los parámetros y las actividades candidatas. El sistema arma el recorrido y comprueba el equilibrio.";

type ToastMessage = { tone: Tone; text: string };

export function GeneratorPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "guide") return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  return <GeneratorLoader />;
}

function GeneratorLoader() {
  const packages = usePackages("generate_itinerary");
  const categories = useCategories();
  const activityTypes = useActivityTypes();
  const queries = [packages, categories, activityTypes];

  const header = <PageHeader title="Generar itinerario" subtitle={SUBTITLE} breadcrumbs={BREADCRUMBS} />;

  if (queries.some(query => query.isError)) {
    return (
      <>
        {header}
        <Alert
          tone="bad"
          title="No se pudieron cargar los paquetes y catálogos"
          action={
            <Button size="sm" onClick={() => queries.filter(query => query.isError).forEach(query => query.refetch())}>
              Reintentar
            </Button>
          }
        >
          {queries.find(query => query.error)?.error?.message}
        </Alert>
      </>
    );
  }

  if (!packages.data || !categories.data || !activityTypes.data) {
    return (
      <>
        {header}
        <Panel title="Paquete y parámetros" aria-busy="true">
          <div className="generator__params">
            <Skeleton height={38} />
            <Skeleton height={38} />
            <Skeleton height={38} />
          </div>
          <Skeleton height={120} />
        </Panel>
      </>
    );
  }

  // Validated packages only (RN-09); the API already filters by the generate permission (RN-02)
  const generable = packages.data.filter(pkg => pkg.status === "approved");

  if (generable.length === 0) {
    return (
      <>
        {header}
        <Panel>
          <EmptyState icon="package" title="No tienes paquetes en los que generar">
            Solo puedes generar itinerarios en paquetes validados donde tengas el permiso «Genera itinerarios». Pídeselo
            a tu administrador.
          </EmptyState>
        </Panel>
      </>
    );
  }

  return <Generator packages={generable} categories={categories.data} types={toTypeOptions(activityTypes.data)} />;
}

type GeneratorProps = {
  packages: Package[];
  categories: Category[];
  types: TypeOption[];
};

function Generator({ packages, categories, types }: GeneratorProps) {
  const [form, setForm] = useState(() => loadDraft(packages) ?? initialForm(packages[0]));
  const [toast, setToast] = useState<ToastMessage | null>(null);

  const activities = usePackageActivities(form.packageId);
  const generate = useGenerateItinerary();
  const submit = useSubmitItinerary();

  const pkg = packages.find(item => item.id === form.packageId) ?? packages[0];
  const inPackage = (activity: Activity) =>
    pkg.categories.some(category => category.id === activity.category_id);

  const candidates = activities.data ?? [];
  const candidateIds = form.candidateIds ?? candidates.filter(inPackage).map(activity => activity.id);
  const selected = candidates.filter(activity => candidateIds.includes(activity.id));

  const valid = validate(form, types);
  const canGenerate = Object.values(valid).every(Boolean) && selected.length >= form.total;
  const itinerary = submit.data ?? generate.data;

  function update(changes: Partial<GeneratorForm>) {
    setForm(current => ({ ...current, ...changes }));
  }

  function changePackage(id: number) {
    const next = packages.find(item => item.id === id);
    if (next) setForm(current => initialForm(next, current));
  }

  function runGenerate(body: GenerateItineraryRequest) {
    generate.mutate(body, { onSuccess: () => submit.reset() });
  }

  function handleGenerate() {
    runGenerate({
      package_id: form.packageId,
      days: form.days,
      activity_count: form.total,
      proportion_types: types.map(type => ({ activity_type_code: type.code, value: form.proportion[type.key] })),
      category_ids: form.categoryIds,
      avoid_late_high_effort: form.avoidLateEffort,
      candidate_ids: candidateIds,
    });
  }

  function handleSubmit(id: number) {
    submit.mutate(id, {
      onSuccess: result => setToast({ tone: "info", text: `Enviaste ${formatItineraryCode(result.id)} a revisión.` }),
      onError: error => setToast({ tone: "bad", text: `No se pudo enviar a revisión: ${error.message}` }),
    });
  }

  function handleSaveDraft() {
    setToast(
      saveDraft(form)
        ? { tone: "ok", text: "Borrador guardado. Lo recuperarás al volver a esta página." }
        : { tone: "bad", text: "No se pudo guardar el borrador en este navegador." },
    );
  }

  return (
    <>
      <PageHeader
        title="Generar itinerario"
        subtitle={SUBTITLE}
        breadcrumbs={BREADCRUMBS}
        actions={<Button onClick={handleSaveDraft}>Guardar borrador</Button>}
      />

      <div className="generator__columns">
        <div className="generator__main">
          <ParamsPanel
            packages={packages}
            pkg={pkg}
            form={form}
            valid={valid}
            candidates={candidates}
            onChange={update}
            onPackageChange={changePackage}
          />
          <CandidatesPanel
            activities={activities}
            candidateIds={candidateIds}
            categories={categories}
            types={types}
            inPackage={inPackage}
            onChange={ids => update({ candidateIds: ids })}
          />
        </div>

        <div className="generator__side">
          <SelectionPanel
            selected={selected}
            types={types}
            total={form.total}
            canGenerate={canGenerate}
            generating={generate.isPending}
            generated={generate.isSuccess}
            onGenerate={handleGenerate}
          />
        </div>
      </div>

      {generate.isIdle && (
        <Panel>
          <EmptyState icon="sparkles" title="Todavía no has generado el itinerario">
            Cuando pulses «Generar itinerario» verás aquí el recorrido día a día y si cumple los criterios de equilibrio.
          </EmptyState>
        </Panel>
      )}

      {generate.isPending && (
        <Panel title="Orden de recorrido">
          <Skeleton variant="stops" label="Generando itinerario" />
        </Panel>
      )}

      {generate.isError && (
        <Alert
          tone="bad"
          title="No se pudo generar el itinerario"
          action={
            <Button size="sm" onClick={() => generate.variables && runGenerate(generate.variables)}>
              Reintentar
            </Button>
          }
        >
          {generate.error.message}
        </Alert>
      )}

      {generate.isSuccess && itinerary && (
        <ResultSection
          itinerary={itinerary}
          types={types}
          submitting={submit.isPending}
          onSubmit={() => handleSubmit(itinerary.id)}
        />
      )}

      {toast && (
        <div className="generator__toast">
          <Toast tone={toast.tone} onClose={() => setToast(null)}>
            {toast.text}
          </Toast>
        </div>
      )}
    </>
  );
}

type ParamsPanelProps = {
  packages: Package[];
  pkg: Package;
  form: GeneratorForm;
  valid: FormValidity;
  candidates: Activity[];
  onChange: (changes: Partial<GeneratorForm>) => void;
  onPackageChange: (id: number) => void;
};

function ParamsPanel({ packages, pkg, form, valid, candidates, onChange, onPackageChange }: ParamsPanelProps) {
  const categoryOptions = pkg.categories.map(category => ({
    value: String(category.id),
    label: category.name,
    count: candidates.filter(activity => activity.category_id === category.id).length,
  }));

  return (
    <Panel title="Paquete y parámetros" subtitle="Se guardan junto al itinerario generado.">
      <div className="generator__params">
        <Field
          id="generator-package"
          label="Paquete turístico"
          options={packages.map(item => ({ value: String(item.id), label: item.name }))}
          value={String(pkg.id)}
          onChange={event => onPackageChange(Number(event.target.value))}
          hint="Paquetes validados en los que puedes generar."
        />
        <Field
          id="generator-days"
          label="Días"
          type="number"
          min={1}
          suffix="días"
          value={form.days}
          onChange={event => onChange({ days: Number(event.target.value) })}
          error={valid.days ? undefined : "Al menos 1 día."}
        />
        <Field
          id="generator-total"
          label="Total de actividades"
          type="number"
          min={MIN_TOTAL}
          max={MAX_TOTAL}
          value={form.total}
          onChange={event => onChange({ total: Number(event.target.value) })}
          hint={valid.total ? `Entre ${MIN_TOTAL} y ${MAX_TOTAL}.` : undefined}
          error={valid.total ? undefined : `Pon entre ${MIN_TOTAL} y ${MAX_TOTAL}.`}
        />
      </div>

      <ProportionInput
        id="generator-proportion"
        total={form.total}
        value={form.proportion}
        onChange={proportion => onChange({ proportion })}
      />

      <div className="generator__coverage">
        <span className="generator__coverage-label">Cobertura de categorías</span>
        <ChipSelect
          label="Categorías a cubrir"
          options={categoryOptions}
          value={form.categoryIds.map(String)}
          onChange={values => onChange({ categoryIds: values.map(Number) })}
        />
        <span className={valid.categories ? "generator__hint" : "generator__hint generator__hint--bad"}>
          {valid.categories
            ? "Vienen marcadas las categorías del paquete. Cada una debe aparecer al menos una vez."
            : "Marca al menos una categoría."}
        </span>
      </div>

      <Checkbox
        label="Evitar esfuerzo alto al final del día"
        description="Ninguna actividad de esfuerzo alto después de las 17:00."
        checked={form.avoidLateEffort}
        onChange={event => onChange({ avoidLateEffort: event.target.checked })}
      />
    </Panel>
  );
}

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

function CandidatesPanel({ activities, candidateIds, categories, types, inPackage, onChange }: CandidatesPanelProps) {
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

type SelectionPanelProps = {
  selected: Activity[];
  types: TypeOption[];
  total: number;
  canGenerate: boolean;
  generating: boolean;
  generated: boolean;
  onGenerate: () => void;
};

function SelectionPanel({ selected, types, total, canGenerate, generating, generated, onGenerate }: SelectionPanelProps) {
  const effort = { bajo: 0, medio: 0, alto: 0 };
  selected.forEach(activity => effort[toEffortLevel(activity.effort_level)]++);

  return (
    <Panel title="Selección">
      <div className="generator__types">
        {types.map(type => {
          const count = selected.filter(activity => activity.activity_type_code === type.code).length;

          return (
            <div key={type.code} className="generator__type-count">
              <Badge tone={type.key}>{type.label}</Badge>
              <span className="generator__figure">{count}</span>
              <span className="generator__share">
                {selected.length ? `${Math.round((count / selected.length) * 100)} % de la selección` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <div className="generator__effort">
        <span className="generator__eyebrow">Esfuerzo</span>
        <EffortSplit effort={effort} />
      </div>

      {selected.length < total ? (
        <Alert tone="bad" title="Faltan candidatas">
          Selecciona al menos tantas actividades como el total pedido ({total}).
        </Alert>
      ) : (
        <Alert tone="info">
          El generador elegirá {total} de tus candidatas para cumplir la proporción y la cobertura.
        </Alert>
      )}

      <Button
        variant={generated ? "secondary" : "primary"}
        icon="sparkles"
        block
        disabled={!canGenerate || generating}
        onClick={onGenerate}
      >
        {generating ? "Generando…" : generated ? "Volver a generar" : "Generar itinerario"}
      </Button>
    </Panel>
  );
}

type ResultSectionProps = {
  itinerary: ItineraryDetail;
  types: TypeOption[];
  submitting: boolean;
  onSubmit: () => void;
};

function ResultSection({ itinerary, types, submitting, onSubmit }: ResultSectionProps) {
  const submitted = itinerary.submitted_date !== null;
  const generatedOn = isToday(itinerary.generated_at) ? "hoy" : `el ${formatDate(itinerary.generated_at)}`;

  return (
    <section className="generator__result" aria-labelledby="generator-result-title">
      <div className="generator__result-head">
        <div className="generator__result-text">
          <div className="generator__result-title-row">
            <h2 id="generator-result-title" className="generator__result-title">
              Resultado · {formatItineraryCode(itinerary.id)}
            </h2>
            <StatusPill status={itineraryStatus(itinerary)} />
          </div>
          <p className="generator__muted">
            {itinerary.package_name} · {itinerary.days.length} días · {itinerary.activity_count} actividades · generado{" "}
            {generatedOn} a las {formatTime(itinerary.generated_at)}
          </p>
        </div>

        <div className="generator__actions">
          <Button icon="download" onClick={() => exportItinerary(itinerary, types)}>
            Exportar PDF
          </Button>
          <Button variant="primary" icon="check-circle" disabled={submitting || submitted} onClick={onSubmit}>
            {submitted ? "Enviado a revisión" : submitting ? "Enviando…" : "Enviar a revisión"}
          </Button>
        </div>
      </div>

      <div className="generator__columns">
        <div className="generator__main">
          {/* Each new itinerary starts on its first day */}
          <RoutePanel
            key={itinerary.id}
            days={itinerary.days}
            subtitle="Esfuerzo acumulado: bajo 1, medio 2, alto 3 puntos."
          />
        </div>

        <div className="generator__side">
          <Panel>
            <CriteriaCheck items={toCriteria(itinerary.criteria)} />
          </Panel>

          {itinerary.discarded.length > 0 && (
            <Panel title="Descartadas">
              {itinerary.discarded.map(item => (
                <p key={item.activity_id} className="generator__muted">
                  {item.activity_name}: {item.reason}
                </p>
              ))}
            </Panel>
          )}
        </div>
      </div>
    </section>
  );
}
