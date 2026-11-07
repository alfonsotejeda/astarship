import { useNavigate, useSearchParams } from "react-router";
import { Button } from "@/components/Button/Button";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Tabs } from "@/components/Tabs/Tabs";
import { useItineraries } from "@/lib/api/itineraries";
import { ItinerariesTable } from "./ItinerariesTable";

type GuideTab = "all" | "mine" | "others";

const GUIDE_TITLES: Record<GuideTab, string> = {
  all: "Todos los itinerarios",
  mine: "Mis itinerarios",
  others: "Itinerarios de otros guías",
};

function toTab(value: string | null): GuideTab {
  return value === "mine" || value === "others" ? value : "all";
}

export function GuideList() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const itineraries = useItineraries();
  const tab = toTab(searchParams.get("tab"));

  const header = (
    <PageHeader
      title="Itinerarios"
      subtitle="De los paquetes en los que estás autorizado. Los de otros guías del mismo paquete los ves en solo lectura."
      actions={
        <Button variant="primary" icon="sparkles" onClick={() => navigate("/itineraries/new")}>
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
  const items = tab === "mine" ? mine : tab === "others" ? others : all;

  return (
    <>
      {header}

      <Tabs
        label="Autor"
        items={[
          { key: "all", label: "Todos", count: all.length },
          { key: "mine", label: "Míos", count: mine.length },
          { key: "others", label: "De otros guías", count: others.length },
        ]}
        value={tab}
        onChange={key => setSearchParams(key === "all" ? {} : { tab: key }, { replace: true })}
      />

      <ItinerariesTable key={tab} items={items} title={GUIDE_TITLES[tab]} allPackagesLabel="Todos mis paquetes" />
    </>
  );
}
