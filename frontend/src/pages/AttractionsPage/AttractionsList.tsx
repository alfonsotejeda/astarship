import { useState } from "react";
import { useNavigate } from "react-router";
import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { AttractionMap } from "@/components/AttractionMap/AttractionMap";
import { Button } from "@/components/Button/Button";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Toast } from "@/components/Toast/Toast";
import { useAttractions, useSaveAttraction } from "@/lib/api/attractions";
import type { Attraction, AttractionForm } from "@/lib/api/attractions";
import { attractionPoint, attractionsText } from "@/lib/attraction";
import { AttractionDrawer } from "./AttractionDrawer";

const SUBTITLES = {
  guide: "Los lugares donde se hacen las actividades. Registra los que falten para poder describir sus actividades.",
  other: "Los lugares donde se hacen las actividades, con su ubicación y cómo se llega desde los demás.",
};

const COLUMNS: Column<Attraction>[] = [
  {
    key: "name",
    label: "Atracción",
    render: attraction => <span className="attractions__strong">{attraction.name}</span>,
  },
  {
    key: "address",
    label: "Dirección",
    render: attraction => <span className="attractions__muted">{attraction.address}</span>,
  },
  { key: "activity_count", label: "Actividades", align: "right" },
];

export function AttractionsList() {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const attractions = useAttractions();
  const saveAttraction = useSaveAttraction();
  const [query, setQuery] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [toast, setToast] = useState<{ tone: "ok" | "bad"; text: string } | null>(null);

  // RF-01: guides register them; the admin edits them from their page
  const canCreate = user.role === "guide";

  const header = (
    <PageHeader
      title="Atracciones"
      subtitle={canCreate ? SUBTITLES.guide : SUBTITLES.other}
      actions={
        canCreate && (
          <Button variant="primary" icon="plus" onClick={() => setIsCreating(true)}>
            Nueva atracción
          </Button>
        )
      }
    />
  );

  if (attractions.isPending) {
    return (
      <>
        {header}
        <LoadingPanel rows={8} />
      </>
    );
  }

  if (attractions.isError) {
    return (
      <>
        {header}
        <LoadError title="No se pudieron cargar las atracciones" error={attractions.error} onRetry={() => attractions.refetch()} />
      </>
    );
  }

  const text = query.trim().toLowerCase();
  const rows = attractions.data.filter(
    item => !text || item.name.toLowerCase().includes(text) || item.address.toLowerCase().includes(text),
  );

  function handleCreate(form: AttractionForm) {
    saveAttraction.mutate(
      { id: null, form },
      {
        onSuccess: created => {
          setIsCreating(false);
          setToast({ tone: "ok", text: `Registraste «${created.name}». Ya puedes describir actividades allí.` });
        },
        onError: error => setToast({ tone: "bad", text: `No se pudo registrar la atracción: ${error.message}` }),
      },
    );
  }

  return (
    <>
      {header}

      <div className="attractions__columns">
        <div className="attractions__main">
          {attractions.data.length === 0 ? (
            <Panel>
              <EmptyState icon="landmark" title="Todavía no hay atracciones">
                {canCreate ? "Registra la primera para poder describir sus actividades." : "Los guías las registran."}
              </EmptyState>
            </Panel>
          ) : (
            <>
              <Panel title="Mapa" subtitle="Pulsa una atracción para ver su ficha." flush>
                <AttractionMap
                  points={rows.map(item => attractionPoint(item, true))}
                  label="Mapa de las atracciones"
                  height={360}
                  className="attractions__map"
                />
              </Panel>

              <FilterBar summary={attractionsText(rows.length)} onReset={() => setQuery("")}>
                <Field
                  id="attractions-query"
                  label="Buscar"
                  placeholder="Nombre o dirección"
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                />
              </FilterBar>

              <DataTable
                title="Atracciones"
                subtitle={text ? `«${query.trim()}»` : "Todas"}
                columns={COLUMNS}
                rows={rows}
                defaultSort={{ key: "name", dir: "asc" }}
                onRowClick={attraction => navigate(`/attractions/${attraction.id}`)}
                exportable
                footer="Actividades: las que se hacen en la atracción."
                emptyText="No hay atracciones con esta búsqueda."
              />
            </>
          )}
        </div>

        {isCreating && (
          <AttractionDrawer
            attraction={null}
            attractions={attractions.data}
            isSaving={saveAttraction.isPending}
            onSave={handleCreate}
            onClose={() => setIsCreating(false)}
          />
        )}
      </div>

      {toast && (
        <div className="attractions__toast">
          <Toast key={toast.text} tone={toast.tone} onClose={() => setToast(null)}>
            {toast.text}
          </Toast>
        </div>
      )}
    </>
  );
}
