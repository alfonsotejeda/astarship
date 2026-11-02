import { Navigate, useParams } from "react-router";
import { RateView } from "./RateView";
import { TodayView } from "./TodayView";
import { TripDetail } from "./TripDetail";
import { TripsView } from "./TripsView";
import "./TripPage.css";

export type TripView = "today" | "trips" | "detail" | "rate";

// Each tourist route says which view it is: /trip/today, /trip/itineraries, …/:id and …/:id/rate
export function TripPage({ view }: { view: TripView }) {
  const { id } = useParams();

  if (view === "today") return <TodayView />;
  if (view === "trips") return <TripsView />;

  const itineraryId = Number(id);
  if (!Number.isInteger(itineraryId)) return <Navigate to="/trip/itineraries" replace />;
  return view === "rate" ? <RateView itineraryId={itineraryId} /> : <TripDetail itineraryId={itineraryId} />;
}
