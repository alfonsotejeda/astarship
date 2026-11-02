import { Navigate, useNavigate, useParams } from "react-router";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Tabs } from "@/components/Tabs/Tabs";
import { usePendingBookings } from "@/lib/api/bookings";
import { AssignTab } from "./AssignTab";
import { PendingTab } from "./PendingTab";
import "./AssignmentsPage.css";

const SUBTITLES = {
  assign: "Asigna un itinerario aprobado a los turistas de un grupo. Nadie puede tener dos itinerarios del mismo paquete.",
  pending: "Paquetes que pidieron los turistas desde el catálogo o en los que los inscribiste. Asígnales un itinerario o recházalos.",
};

// /assignments by group and /assignments/pending, the bookings waiting for an itinerary
export function AssignmentsPage() {
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const pending = usePendingBookings();

  if (tabParam !== undefined && tabParam !== "pending") return <Navigate to="/assignments" replace />;
  const tab = tabParam === "pending" ? "pending" : "assign";

  return (
    <>
      <PageHeader title="Asignaciones" subtitle={SUBTITLES[tab]} />

      <Tabs
        label="Secciones de asignaciones"
        items={[
          { key: "assign", label: "Por grupo" },
          { key: "pending", label: "Pendientes", count: pending.data?.length },
        ]}
        value={tab}
        onChange={key => navigate(key === "pending" ? "/assignments/pending" : "/assignments")}
      />

      {tab === "pending" ? <PendingTab bookings={pending} /> : <AssignTab />}
    </>
  );
}
