import { useState } from "react";
import { Field } from "@/components/Field/Field";

const TYPES = [
  { value: "visita", label: "Visita" },
  { value: "excursion", label: "Excursión" },
  { value: "taller", label: "Taller" },
];

const gridStyle = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "var(--space-5)",
};

export function FieldPreview() {
  const [name, setName] = useState("Recorrido por la Plaza Vieja");
  const nameTaken = name.trim() === "Recorrido por la Plaza Vieja";

  return (
    <>
      <section className="preview-section">
        <h2>Variantes</h2>
        <div style={gridStyle}>
          <Field
            id="f-name"
            label="Nombre de la actividad"
            required
            value={name}
            onChange={event => setName(event.target.value)}
            error={nameTaken ? "Ya existe una actividad con este nombre en esta atracción." : undefined}
          />
          <Field id="f-type" label="Tipo" options={TYPES} defaultValue="excursion" />
          <Field
            id="f-duration"
            label="Duración"
            type="number"
            defaultValue={90}
            suffix="min"
            hint="Entre 15 y 480 minutos."
          />
          <Field
            id="f-description"
            label="Describe el cambio que necesitas"
            multiline
            placeholder="Qué actividad quieres cambiar y por qué"
            hint="Lo leerá tu guía y, si lo pides, un guía de apoyo."
          />
        </div>
      </section>

      <section className="preview-section">
        <h2>Deshabilitado</h2>
        <div style={gridStyle}>
          <Field id="f-disabled" label="Atracción" defaultValue="Plaza Vieja" disabled />
        </div>
      </section>
    </>
  );
}
