import { Panel } from "@/components/Panel/Panel";
import type { TripGuide } from "@/lib/api/trips";

export function GuidePanel({ guide }: { guide: TripGuide }) {
  return (
    <Panel title="Tu guía">
      <div className="trip__guide">
        <span className="trip__strong">{guide.name}</span>
        {guide.specialty && <span className="trip__muted">Especialidad: {guide.specialty.toLowerCase()}</span>}
        {guide.phone && (
          <a className="trip__mono trip__phone" href={`tel:${guide.phone.replace(/\s/g, "")}`}>
            {guide.phone}
          </a>
        )}
      </div>
    </Panel>
  );
}
