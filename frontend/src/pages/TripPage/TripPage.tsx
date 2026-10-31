import { Navigate, useLocation, useParams } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { DetailView } from "./components/DetailView";
import { RateView } from "./components/RateView";
import { TodayView } from "./components/TodayView";
import { TripsView } from "./components/TripsView";
import "./TripPage.css";

export function TripPage() {
  const { user } = useAuth();
  const { id } = useParams();
  const { pathname } = useLocation();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "tourist") return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  if (id !== undefined) {
    const itineraryId = Number(id);
    if (!Number.isInteger(itineraryId)) return <Navigate to="/viaje/itinerarios" replace />;
    if (pathname.endsWith("/valorar")) return <RateView itineraryId={itineraryId} userId={user.id} />;
    return <DetailView itineraryId={itineraryId} />;
  }

  if (pathname.startsWith("/viaje/itinerarios")) return <TripsView />;
  return <TodayView userId={user.id} />;
}
