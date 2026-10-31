import { Navigate, useParams } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { DetailView } from "./components/DetailView";
import { GuideList } from "./components/GuideList";
import { ManagerList } from "./components/ManagerList";
import "./ItinerariesPage.css";

export function ItinerariesPage() {
  const { user } = useAuth();
  const { id } = useParams();

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "guide" && user.role !== "manager") return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  if (id !== undefined) {
    const itineraryId = Number(id);
    if (!Number.isInteger(itineraryId)) return <Navigate to="/itinerarios" replace />;
    return <DetailView id={itineraryId} />;
  }

  return user.role === "manager" ? <ManagerList /> : <GuideList />;
}
