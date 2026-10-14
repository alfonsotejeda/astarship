import { useState } from "react";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";

const ITINERARIES = [
  { id: "IT-0151", pkg: "La Habana colonial", creator: "Laura Pérez" },
  { id: "IT-0152", pkg: "La Habana colonial", creator: "Ernesto Díaz" },
  { id: "IT-0160", pkg: "Viñales natural", creator: "Laura Pérez" },
  { id: "IT-0171", pkg: "Trinidad y Topes", creator: "Ernesto Díaz" },
];

const ALL = "Todos";

export function FilterBarPreview() {
  const [pkg, setPkg] = useState(ALL);
  const [creator, setCreator] = useState(ALL);
  const [query, setQuery] = useState("");

  const results = ITINERARIES.filter(
    item =>
      (pkg === ALL || item.pkg === pkg) &&
      (creator === ALL || item.creator === creator) &&
      item.id.toLowerCase().includes(query.trim().toLowerCase()),
  );

  function reset() {
    setPkg(ALL);
    setCreator(ALL);
    setQuery("");
  }

  return (
    <>
      <section className="preview-section">
        <h2>Con resumen y limpiar</h2>
        <FilterBar summary={`${results.length} itinerarios`} onReset={reset}>
          <Field
            id="fb-package"
            label="Paquete"
            options={[ALL, "La Habana colonial", "Viñales natural", "Trinidad y Topes"]}
            value={pkg}
            onChange={event => setPkg(event.target.value)}
          />
          <Field
            id="fb-creator"
            label="Creador"
            options={[ALL, "Laura Pérez", "Ernesto Díaz"]}
            value={creator}
            onChange={event => setCreator(event.target.value)}
          />
          <Field
            id="fb-query"
            label="Buscar"
            placeholder="ID de itinerario"
            value={query}
            onChange={event => setQuery(event.target.value)}
          />
        </FilterBar>
        <span>{results.map(item => item.id).join(" · ") || "Sin resultados"}</span>
      </section>

      <section className="preview-section">
        <h2>Solo filtros</h2>
        <FilterBar>
          <Field id="fb-range" label="Desde" type="date" />
          <Field id="fb-range-end" label="Hasta" type="date" />
        </FilterBar>
      </section>
    </>
  );
}
