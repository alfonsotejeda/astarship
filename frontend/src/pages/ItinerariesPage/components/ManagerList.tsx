import { useSearchParams } from "react-router";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Tabs } from "@/components/Tabs/Tabs";
import { useItineraries } from "@/lib/api/itineraries";
import { reviewQueue } from "../lib/queue";
import { ItinerariesTable } from "./ItinerariesTable";
import { LoadError, LoadingPanel } from "./QueryStatus";
import { ReviewedTable } from "./ReviewedTable";
import { ReviewQueue } from "./ReviewQueue";

const SUBTITLES: Record<string, string> = {
  revisar: "Itinerarios validados por un guía y pendientes de tu aprobación. Los más antiguos primero.",
  todos: "Todos los itinerarios de los paquetes, en cualquier estado.",
};

export function ManagerList() {
  const [searchParams, setSearchParams] = useSearchParams();
  const itineraries = useItineraries();
  const tab = searchParams.get("tab") ?? "revisar";

  const queue = itineraries.data ? reviewQueue(itineraries.data) : [];

  const header = (
    <>
      <PageHeader title={tab === "todos" ? "Itinerarios" : "Por revisar"} subtitle={SUBTITLES[tab] ?? SUBTITLES.revisar} />
      <Tabs
        label="Vista"
        items={[
          { key: "revisar", label: "Por revisar", count: itineraries.data ? queue.length : undefined },
          { key: "todos", label: "Todos", count: itineraries.data?.length },
        ]}
        value={tab}
        onChange={key => setSearchParams({ tab: key }, { replace: true })}
      />
    </>
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

  if (tab === "todos") {
    return (
      <>
        {header}
        <ItinerariesTable items={itineraries.data} title="Todos los itinerarios" allPackagesLabel="Todos" />
      </>
    );
  }

  return (
    <>
      {header}
      <ReviewQueue queue={queue} />
      <ReviewedTable />
    </>
  );
}
