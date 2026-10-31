import { Badge } from "@/components/Badge/Badge";
import { Panel } from "@/components/Panel/Panel";
import type { ItineraryDetail } from "@/lib/api/itineraries";
import { proportionText } from "@/lib/itinerary";

export function ParamsPanel({ itinerary }: { itinerary: ItineraryDetail }) {
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
