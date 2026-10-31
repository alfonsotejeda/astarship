import { Link } from "react-router";
import { Panel } from "@/components/Panel/Panel";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { PackageHistoryItem } from "@/lib/api/itineraries";
import { formatDate, formatItineraryCode } from "@/lib/format";
import { itineraryStatus } from "@/lib/itinerary";

export function HistoryPanel({ history }: { history: PackageHistoryItem[] }) {
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
