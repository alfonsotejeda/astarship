import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { Dialog } from "@/components/Dialog/Dialog";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { ItineraryCard } from "@/components/ItineraryCard/ItineraryCard";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Skeleton } from "@/components/Skeleton/Skeleton";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { useAssignItinerary } from "@/lib/api/assignments";
import { useItineraries } from "@/lib/api/itineraries";
import type { ItinerarySummary } from "@/lib/api/itineraries";
import { usePackages } from "@/lib/api/packages";
import type { Package } from "@/lib/api/packages";
import { useGroupTourists, useTravelGroups } from "@/lib/api/people";
import type { GroupTourist, TravelGroup } from "@/lib/api/people";
import { formatDate, formatItineraryCode } from "@/lib/format";
import { itineraryStatus, proportionText, toEffortCount } from "@/lib/itinerary";
import "./AssignmentsPage.css";

export function AssignmentsPage() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
  return <AssignmentsView />;
}

const HEADER = (
  <PageHeader
    title="Asignaciones"
    subtitle="Asigna un itinerario aprobado a los turistas de un grupo. Nadie puede tener dos itinerarios del mismo paquete."
  />
);

function AssignmentsView() {
  const packages = usePackages();
  const itineraries = useItineraries();
  const groups = useTravelGroups();
  const queries = [packages, itineraries, groups];

  if (queries.some(query => query.isPending)) {
    return (
      <>
        {HEADER}
        <div className="assignments__columns">
          <div className="assignments__side">
            <LoadingPanel rows={4} />
          </div>
          <div className="assignments__main">
            <LoadingPanel rows={8} />
          </div>
        </div>
      </>
    );
  }

  const failed = queries.find(query => query.isError);
  if (failed || !packages.data || !itineraries.data || !groups.data) {
    return (
      <>
        {HEADER}
        <LoadError
          title="No se pudieron cargar los datos para asignar"
          error={failed?.error ?? null}
          onRetry={() => queries.forEach(query => query.refetch())}
        />
      </>
    );
  }

  // RN-09: only validated packages take assignments
  const validated = packages.data.filter(pkg => pkg.status === "approved");
  if (validated.length === 0) {
    return (
      <>
        {HEADER}
        <Panel>
          <EmptyState icon="package" title="No hay paquetes validados">
            Solo se asignan itinerarios de paquetes que ya validó el jefe de operaciones.
          </EmptyState>
        </Panel>
      </>
    );
  }

  return <AssignmentsContent packages={validated} itineraries={itineraries.data} groups={groups.data} />;
}

type Pending = { touristIds: number[]; skipped: number };

type AssignmentsContentProps = {
  packages: Package[];
  itineraries: ItinerarySummary[];
  groups: TravelGroup[];
};

function itineraryLabel(item: ItinerarySummary) {
  const days = item.days === 1 ? "1 día" : `${item.days} días`;
  return `${formatItineraryCode(item.id)} · ${days} · ${item.guide_name}`;
}

function touristCount(count: number) {
  return count === 1 ? "1 turista" : `${count} turistas`;
}

function AssignmentsContent({ packages, itineraries, groups }: AssignmentsContentProps) {
  const navigate = useNavigate();
  const assign = useAssignItinerary();
  const [packageId, setPackageId] = useState(packages[0].id);
  const [itineraryId, setItineraryId] = useState<number | null>(null);
  const [groupId, setGroupId] = useState<number | null>(null);
  const [startDate, setStartDate] = useState("");
  const [pending, setPending] = useState<Pending | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const pkg = packages.find(item => item.id === packageId) ?? packages[0];
  const approved = itineraries.filter(item => item.package_id === pkg.id && item.status === "approved");
  const itinerary = approved.find(item => item.id === itineraryId) ?? approved[0];
  const packageGroups = groups.filter(item => item.package_id === pkg.id);
  const group = packageGroups.find(item => item.id === groupId) ?? packageGroups[0];
  // The group's trip start is the usual one, but it can be moved
  const shownDate = startDate || group?.start_date || "";

  function changePackage(value: string) {
    setPackageId(Number(value));
    setItineraryId(null);
    setGroupId(null);
    setStartDate("");
  }

  function changeGroup(value: string) {
    setGroupId(Number(value));
    setStartDate("");
  }

  function confirm() {
    if (!pending || !itinerary || !group) return;
    const count = pending.touristIds.length;
    assign.mutate(
      { itineraryId: itinerary.id, user_ids: pending.touristIds, start_date: shownDate },
      {
        onSuccess: () => setDone(`${formatItineraryCode(itinerary.id)} asignado a ${touristCount(count)} de ${group.name}.`),
        onSettled: () => setPending(null),
      },
    );
  }

  const code = itinerary ? formatItineraryCode(itinerary.id) : "";

  return (
    <>
      {HEADER}

      {done && (
        <Alert tone="ok" title="Itinerario asignado" onDismiss={() => setDone(null)}>
          {done}
        </Alert>
      )}

      {assign.isError && (
        <Alert tone="bad" title="No se pudo asignar" onDismiss={() => assign.reset()}>
          {assign.error.message}
        </Alert>
      )}

      <div className="assignments__columns">
        <div className="assignments__side">
          <Panel title="Qué asignar">
            <Field
              id="assignments-package"
              label="Paquete"
              options={packages.map(item => ({ value: String(item.id), label: item.name }))}
              value={String(pkg.id)}
              onChange={event => changePackage(event.target.value)}
            />
            <Field
              id="assignments-itinerary"
              label="Itinerario aprobado"
              options={
                approved.length > 0
                  ? approved.map(item => ({ value: String(item.id), label: itineraryLabel(item) }))
                  : [{ value: "", label: "Sin itinerarios aprobados" }]
              }
              value={itinerary ? String(itinerary.id) : ""}
              disabled={approved.length === 0}
              hint="Solo aparecen los aprobados por el jefe de operaciones."
              onChange={event => setItineraryId(Number(event.target.value))}
            />
            <Field
              id="assignments-group"
              label="Grupo de viaje"
              options={
                packageGroups.length > 0
                  ? packageGroups.map(item => ({
                      value: String(item.id),
                      label: `${item.name} · ${touristCount(item.tourist_count)}`,
                    }))
                  : [{ value: "", label: "Sin grupos en este paquete" }]
              }
              value={group ? String(group.id) : ""}
              disabled={packageGroups.length === 0}
              onChange={event => changeGroup(event.target.value)}
            />
            <Field
              id="assignments-date"
              label="Fecha de inicio"
              type="date"
              value={shownDate}
              disabled={!group}
              onChange={event => setStartDate(event.target.value)}
            />
          </Panel>

          {itinerary && (
            <Panel title={`${code} en breve`}>
              <ItineraryCard
                itinerary={{
                  id: code,
                  package: itinerary.package_name,
                  status: itineraryStatus(itinerary),
                  creator: itinerary.guide_name,
                  date: formatDate(itinerary.submitted_date ?? itinerary.creation_date),
                  days: itinerary.days,
                  activities: itinerary.activity_count,
                  effort: toEffortCount(itinerary.effort),
                  params: proportionText(itinerary.proportion_types),
                }}
                onClick={() => navigate(`/itinerarios/${itinerary.id}`)}
              />
            </Panel>
          )}
        </div>

        <div className="assignments__main">
          {!itinerary ? (
            <Panel>
              <EmptyState icon="route" title={`${pkg.name} no tiene itinerarios aprobados`}>
                Cuando el jefe de operaciones apruebe alguno podrás asignarlo aquí.
              </EmptyState>
            </Panel>
          ) : !group ? (
            <Panel>
              <EmptyState
                icon="users"
                title={`${pkg.name} no tiene grupos de viaje`}
                action={<Button onClick={() => navigate("/personas")}>Ir a Personas</Button>}
              >
                Crea un grupo en Turistas y grupos para poder asignarle el itinerario.
              </EmptyState>
            </Panel>
          ) : (
            <GroupPanel
              key={group.id}
              group={group}
              packageName={pkg.name}
              busy={assign.isPending}
              onAssign={(touristIds, skipped) => setPending({ touristIds, skipped })}
            />
          )}
        </div>
      </div>

      {pending && itinerary && group && (
        <Dialog
          open
          title={`¿Asignar ${code}?`}
          onClose={() => setPending(null)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setPending(null)}>
                Cancelar
              </Button>
              <Button variant="primary" disabled={assign.isPending} onClick={confirm}>
                {assign.isPending ? "Asignando…" : `Asignar a ${touristCount(pending.touristIds.length)}`}
              </Button>
            </>
          }
        >
          <p className="assignments__text">
            {code} · {pkg.name} se asignará a {touristCount(pending.touristIds.length)} de {group.name}, empezando el{" "}
            {formatDate(shownDate)}.
          </p>
          <p className="assignments__text assignments__muted">
            Cada turista lo verá en Mis itinerarios.
            {pending.skipped > 0 &&
              ` Se omiten ${pending.skipped === 1 ? "el que ya tiene" : `los ${pending.skipped} que ya tienen`} un itinerario de este paquete.`}
          </p>
        </Dialog>
      )}
    </>
  );
}

type GroupPanelProps = {
  group: TravelGroup;
  packageName: string;
  busy: boolean;
  onAssign: (touristIds: number[], skipped: number) => void;
};

function GroupPanel({ group, packageName, busy, onAssign }: GroupPanelProps) {
  const tourists = useGroupTourists(group.id);

  if (tourists.isPending) {
    return (
      <Panel title={group.name} aria-busy="true">
        {Array.from({ length: 5 }, (_, index) => (
          <Skeleton key={index} height={40} />
        ))}
      </Panel>
    );
  }

  if (tourists.isError) {
    return (
      <LoadError title="No se pudieron cargar los turistas del grupo" error={tourists.error} onRetry={() => tourists.refetch()} />
    );
  }

  if (tourists.data.length === 0) {
    return (
      <Panel title={group.name}>
        <EmptyState icon="users" title="Este grupo todavía no tiene turistas">
          Añádelos desde Personas, en Turistas y grupos.
        </EmptyState>
      </Panel>
    );
  }

  // Remounts when the members change, so a new assignment starts from the free ones again
  const key = tourists.data.map(item => `${item.id}:${item.itinerary_id}`).join(",");
  return (
    <TouristPicker
      key={key}
      group={group}
      packageName={packageName}
      tourists={tourists.data}
      busy={busy}
      onAssign={onAssign}
    />
  );
}

function TouristPicker({ group, packageName, tourists, busy, onAssign }: GroupPanelProps & { tourists: GroupTourist[] }) {
  // RN-04: whoever already has an itinerary of the package cannot be picked
  const blocked = tourists.filter(item => item.itinerary_id !== null);
  const free = tourists.filter(item => item.itinerary_id === null);
  // «Asignar a todo el grupo» is the default (PA-4); exceptions are unticked by hand
  const [picked, setPicked] = useState(() => free.map(item => item.id));

  const allOn = free.length > 0 && picked.length === free.length;
  const summary = `${picked.length} de ${free.length} disponibles seleccionados`;

  function toggle(id: number) {
    setPicked(current => (current.includes(id) ? current.filter(item => item !== id) : [...current, id]));
  }

  return (
    <div className="assignments__group">
      {blocked.length > 0 && (
        <Alert tone="bad" title="Asignación doble evitada">
          {blocked.map(item => item.name).join(", ").replace(/, ([^,]*)$/, " y $1")}{" "}
          {blocked.length === 1 ? "ya tiene" : "ya tienen"} un itinerario de {packageName}. No se pueden seleccionar; quita
          antes su asignación actual si quieres cambiarla.
        </Alert>
      )}

      <Panel title={group.name} subtitle={summary} flush>
        <div className="assignments__row assignments__row--head">
          <Checkbox
            id="assignments-all"
            label="Seleccionar todo el grupo"
            checked={allOn}
            disabled={free.length === 0}
            onChange={() => setPicked(allOn ? [] : free.map(item => item.id))}
          />
          <span className="assignments__eyebrow">Situación en este paquete</span>
        </div>

        <ul className="assignments__list">
          {tourists.map(tourist => {
            const has = tourist.itinerary_id;
            return (
              <li key={tourist.id} className="assignments__row">
                <Checkbox
                  id={`assignments-tourist-${tourist.id}`}
                  label={tourist.name}
                  description={`${tourist.age} años`}
                  checked={has === null && picked.includes(tourist.id)}
                  disabled={has !== null}
                  onChange={() => toggle(tourist.id)}
                />
                {has !== null ? (
                  <StatusPill status="denegada">Ya tiene {formatItineraryCode(has)}</StatusPill>
                ) : (
                  <StatusPill status="pendiente">Sin asignar</StatusPill>
                )}
              </li>
            );
          })}
        </ul>

        <div className="assignments__row assignments__row--foot">
          <span className="assignments__muted">{summary}</span>
          <Button variant="primary" disabled={picked.length === 0 || busy} onClick={() => onAssign(picked, blocked.length)}>
            Asignar a {touristCount(picked.length)}
          </Button>
        </div>
      </Panel>
    </div>
  );
}
