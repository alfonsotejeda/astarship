import { Navigate, useParams } from "react-router";
import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { GuideList } from "./GuideList";
import { ItineraryDetail } from "./ItineraryDetail";
import { ManagerList } from "./ManagerList";
import "./ItinerariesPage.css";

// /itineraries for the guide and the manager, each with their own list; /itineraries/:id for both
export function ItinerariesPage() {
  const user = useCurrentUser();
  const { id } = useParams();

  if (id !== undefined) {
    const itineraryId = Number(id);
    if (!Number.isInteger(itineraryId)) return <Navigate to="/itineraries" replace />;
    return <ItineraryDetail id={itineraryId} />;
  }

  return user.role === "manager" ? <ManagerList /> : <GuideList />;
}
