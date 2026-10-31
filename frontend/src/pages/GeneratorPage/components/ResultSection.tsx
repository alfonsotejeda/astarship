import { Button } from "@/components/Button/Button";
import { CriteriaCheck } from "@/components/CriteriaCheck/CriteriaCheck";
import { Panel } from "@/components/Panel/Panel";
import { RouteTimeline } from "@/components/RouteTimeline/RouteTimeline";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import type { ItineraryDetail } from "@/lib/api/itineraries";
import { formatDate, formatItineraryCode, formatTime, isToday } from "@/lib/format";
import { ITINERARY_STATUS } from "@/lib/status";
import type { TypeOption } from "../lib/form";
import { CRITERION_LABEL, dayLabel, exportItinerary, toStops } from "../lib/mappers";

type ResultSectionProps = {
  itinerary: ItineraryDetail;
  types: TypeOption[];
  day: string;
  onDayChange: (day: string) => void;
  submitting: boolean;
  onSubmit: () => void;
};

export function ResultSection({ itinerary, types, day, onDayChange, submitting, onSubmit }: ResultSectionProps) {
  const current = itinerary.days.find(item => String(item.day) === day) ?? itinerary.days[0];
  const submitted = itinerary.submitted_date !== null;
  const generatedOn = isToday(itinerary.generated_at) ? "hoy" : `el ${formatDate(itinerary.generated_at)}`;
  // Same points as RouteTimeline: the busiest day fills the bar
  const maxEffort = Math.max(
    ...itinerary.days.map(item => item.stops.reduce((sum, stop) => sum + stop.effort_level, 0)),
  );
  const criteria = itinerary.criteria.map(criterion => ({ ...criterion, label: CRITERION_LABEL[criterion.key] }));

  return (
    <section className="generator__result" aria-labelledby="generator-result-title">
      <div className="generator__result-head">
        <div className="generator__result-text">
          <div className="generator__result-title-row">
            <h2 id="generator-result-title" className="generator__result-title">
              Resultado · {formatItineraryCode(itinerary.id)}
            </h2>
            <StatusPill status={ITINERARY_STATUS[itinerary.status]} />
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
          <Panel title="Orden de recorrido" subtitle="Esfuerzo acumulado: bajo 1, medio 2, alto 3 puntos.">
            <Tabs
              label="Días"
              items={itinerary.days.map(item => ({ key: String(item.day), label: dayLabel(item) }))}
              value={current ? String(current.day) : undefined}
              onChange={onDayChange}
            />
            {current && <RouteTimeline stops={toStops(current)} maxEffort={maxEffort} label={dayLabel(current)} />}
          </Panel>
        </div>

        <div className="generator__side">
          <Panel>
            <CriteriaCheck items={criteria} />
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
