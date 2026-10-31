import { useState } from "react";
import { useNavigate } from "react-router";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { ItineraryCard } from "@/components/ItineraryCard/ItineraryCard";
import { Panel } from "@/components/Panel/Panel";
import type { ItinerarySummary } from "@/lib/api/itineraries";
import { formatDate, formatItineraryCode } from "@/lib/format";
import { itineraryStatus, proportionText, toEffortCount } from "@/lib/itinerary";
import { guideOptions, isBalanced, packageOptions } from "../lib/filters";

const BALANCE_OPTIONS = [
  { value: "", label: "Todos" },
  { value: "ok", label: "Cumple todos" },
  { value: "bad", label: "Incumple alguno" },
];

export function ReviewQueue({ queue }: { queue: ItinerarySummary[] }) {
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
