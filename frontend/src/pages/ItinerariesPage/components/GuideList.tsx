import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/Button/Button";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Tabs } from "@/components/Tabs/Tabs";
import { useItineraries } from "@/lib/api/itineraries";
import { ItinerariesTable } from "./ItinerariesTable";
import { LoadError, LoadingPanel } from "./QueryStatus";

const TITLES: Record<string, string> = {
  todos: "Todos los itinerarios",
  mios: "Mis itinerarios",
  otros: "Itinerarios de otros guías",
};

export function GuideList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const itineraries = useItineraries();
  const tab = searchParams.get("tab") ?? "todos";

  const header = (
    <PageHeader
      title="Itinerarios"
      subtitle="De los paquetes en los que estás autorizado. Los de otros guías del mismo paquete los ves en solo lectura."
      actions={
        <Button variant="primary" icon="sparkles" onClick={() => navigate("/itinerarios/nuevo")}>
          Generar itinerario
        </Button>
      }
    />
  );

  if (itineraries.isPending) {
    return (
      <>
        {header}
        <LoadingPanel />
      </>
    );
  }

  if (itineraries.isError) {
    return (
      <>
        {header}
        <LoadError title="No se pudieron cargar los itinerarios" error={itineraries.error} onRetry={() => itineraries.refetch()} />
      </>
    );
  }

  const all = itineraries.data;
  const mine = all.filter(item => item.is_mine);
  const others = all.filter(item => !item.is_mine);
  const items = tab === "mios" ? mine : tab === "otros" ? others : all;

  return (
    <>
      {header}

      <Tabs
        label="Autor"
        items={[
          { key: "todos", label: "Todos", count: all.length },
          { key: "mios", label: "Míos", count: mine.length },
          { key: "otros", label: "De otros guías", count: others.length },
        ]}
        value={tab}
        onChange={key => setSearchParams({ tab: key }, { replace: true })}
      />

      <ItinerariesTable key={tab} items={items} title={TITLES[tab] ?? TITLES.todos} allPackagesLabel="Todos mis paquetes" />
    </>
  );
}
