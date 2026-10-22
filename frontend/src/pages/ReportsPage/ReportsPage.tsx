import { useParams } from "react-router";

// Placeholder: implemented in #105.
export function ReportsPage() {
  const { rc } = useParams();
  return <h1>Reporte {rc?.toUpperCase()}</h1>;
}
