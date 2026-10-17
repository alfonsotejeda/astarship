import { useState } from "react";
import { ActivityRow } from "@/components/ActivityRow/ActivityRow";
import type { Activity } from "@/components/ActivityRow/ActivityRow";
import { Button } from "@/components/Button/Button";
import { Panel } from "@/components/Panel/Panel";

const ACTIVITIES: Activity[] = [
  { id: 1, name: "Castillo de la Real Fuerza", attraction: "Plaza de Armas", author: "Laura Pérez", type: "visita", category: "Patrimonio", effort: "bajo", duration: "1 h" },
  { id: 2, name: "Subida al Morro", attraction: "Castillo del Morro", author: "Ernesto Díaz", type: "excursion", category: "Patrimonio", effort: "alto", duration: "2 h" },
  { id: 3, name: "Recorrido por la Plaza Vieja", attraction: "Plaza Vieja", author: "Yanet Rodríguez", type: "excursion", category: "Patrimonio", effort: "medio", duration: "1 h 30 min" },
  { id: 4, name: "Taller de cocina criolla", attraction: "Paladar El Patio", author: "Laura Pérez", type: "taller", category: "Gastronomía", effort: "bajo", duration: "1 h 30 min" },
];

const sectionStyle = { maxWidth: 720 };

export function ActivityRowPreview() {
  const [selected, setSelected] = useState<(string | number | undefined)[]>([1]);
  const [ordered, setOrdered] = useState(ACTIVITIES.slice(0, 3));

  function toggle(id: Activity["id"], isSelected: boolean) {
    setSelected(previous => (isSelected ? [...previous, id] : previous.filter(item => item !== id)));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    setOrdered(next);
  }

  return (
    <>
      <section className="preview-section" style={sectionStyle}>
        <h2>Banco (lectura)</h2>
        <Panel flush>
          {ACTIVITIES.slice(0, 2).map(activity => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              trailing={<Button variant="ghost" size="sm" icon="trash" aria-label={`Eliminar ${activity.name}`} />}
            />
          ))}
        </Panel>
      </section>

      <section className="preview-section" style={sectionStyle}>
        <h2>Generador (casilla)</h2>
        <Panel flush title="Actividades seleccionadas" subtitle={`${selected.length} de ${ACTIVITIES.length}`}>
          {ACTIVITIES.map(activity => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              selected={selected.includes(activity.id)}
              onSelectChange={isSelected => toggle(activity.id, isSelected)}
              warning={activity.id === 3 ? "Posible duplicado de «Ruta por la Habana Vieja»" : undefined}
            />
          ))}
        </Panel>
      </section>

      <section className="preview-section" style={sectionStyle}>
        <h2>Orden del itinerario (↑ ↓ desde el asa)</h2>
        <Panel flush>
          {ordered.map((activity, index) => (
            <ActivityRow
              key={activity.id}
              activity={activity}
              order={index + 1}
              orderable
              onMove={direction => move(index, direction)}
              trailing={<Button variant="ghost" size="sm" icon="trash" aria-label={`Quitar ${activity.name}`} />}
            />
          ))}
        </Panel>
      </section>
    </>
  );
}
