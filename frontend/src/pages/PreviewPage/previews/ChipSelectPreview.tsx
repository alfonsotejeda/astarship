import { useState } from "react";
import { ChipSelect } from "@/components/ChipSelect/ChipSelect";

const CATEGORIES = [
  { value: "patrimonio", label: "Patrimonio", count: 12 },
  { value: "gastronomia", label: "Gastronomía", count: 6 },
  { value: "naturaleza", label: "Naturaleza", count: 4 },
  { value: "musica", label: "Música", count: 5 },
  { value: "arte", label: "Arte", count: 7 },
];

export function ChipSelectPreview() {
  const [types, setTypes] = useState(["Visita"]);

  return (
    <>
      <section className="preview-section">
        <h2>Con contador (libre)</h2>
        <ChipSelect label="Categorías a cubrir" options={CATEGORIES} defaultValue={["patrimonio", "gastronomia"]} />
      </section>

      <section className="preview-section">
        <h2>Controlado</h2>
        <ChipSelect label="Tipos" options={["Visita", "Excursión", "Taller"]} value={types} onChange={setTypes} />
        <span>Seleccionados: {types.length ? types.join(", ") : "ninguno"}</span>
      </section>
    </>
  );
}
