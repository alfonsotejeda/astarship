import { Alert } from "@/components/Alert/Alert";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { EffortSplit } from "@/components/ItineraryCard/EffortSplit";
import { Panel } from "@/components/Panel/Panel";
import { toEffortLevel } from "@/lib/api/activities";
import type { Activity } from "@/lib/api/activities";
import type { TypeOption } from "../lib/form";

type SelectionPanelProps = {
  selected: Activity[];
  types: TypeOption[];
  total: number;
  canGenerate: boolean;
  generating: boolean;
  generated: boolean;
  onGenerate: () => void;
};

export function SelectionPanel({ selected, types, total, canGenerate, generating, generated, onGenerate }: SelectionPanelProps) {
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
