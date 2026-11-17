import { Navigate, useParams } from "react-router";
import { AttractionDetail } from "./AttractionDetail";
import { AttractionsList } from "./AttractionsList";
import "./AttractionsPage.css";

// /attractions and /attractions/:id, for every role (RF-07)
export function AttractionsPage() {
  const { id } = useParams();

  if (id === undefined) return <AttractionsList />;

  const attractionId = Number(id);
  if (!Number.isInteger(attractionId)) return <Navigate to="/attractions" replace />;
  // A fresh page for each attraction: the drawer and dialogs do not carry over
  return <AttractionDetail key={attractionId} id={attractionId} />;
}
