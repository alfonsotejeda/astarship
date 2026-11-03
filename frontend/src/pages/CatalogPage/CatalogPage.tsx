import { Navigate, useParams } from "react-router";
import { PackageDetail } from "./PackageDetail";
import { PackageList } from "./PackageList";
import "./CatalogPage.css";

// The tourist explores package → itinerary → attraction and picks packages (revision-frontend.md §1)
export function CatalogPage() {
  const { packageId } = useParams();

  if (packageId === undefined) return <PackageList />;

  const id = Number(packageId);
  if (!Number.isInteger(id)) return <Navigate to="/catalog" replace />;
  return <PackageDetail key={id} id={id} />;
}
