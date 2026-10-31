import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import type { Tone } from "@/components/Alert/tones";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { Toast } from "@/components/Toast/Toast";
import { usePackageActivities } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import { useActivityTypes, useCategories } from "@/lib/api/catalogs";
import type { Category } from "@/lib/api/catalogs";
import { useGenerateItinerary, useSubmitItinerary } from "@/lib/api/itineraries";
import type { GenerateItineraryRequest } from "@/lib/api/itineraries";
import { usePackages } from "@/lib/api/packages";
import type { Package } from "@/lib/api/packages";
import { formatItineraryCode } from "@/lib/format";
import { CandidatesPanel } from "./components/CandidatesPanel";
import { ParamsPanel } from "./components/ParamsPanel";
import { ResultSection } from "./components/ResultSection";
import { SelectionPanel } from "./components/SelectionPanel";
import { initialForm, loadDraft, saveDraft, toTypeOptions, validate } from "./lib/form";
import type { GeneratorForm, TypeOption } from "./lib/form";
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
  const [day, setDay] = useState("");
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
    generate.mutate(body, {
      onSuccess: result => {
        setDay(String(result.days[0]?.day ?? ""));
        submit.reset();
      },
    });
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
          day={day}
          onDayChange={setDay}
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
