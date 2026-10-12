import { createBrowserRouter, Navigate } from "react-router";
import { RootLayout } from "@/components/RootLayout/RootLayout";
import { ActivitiesPage } from "@/pages/ActivitiesPage/ActivitiesPage";
import { AssignmentsPage } from "@/pages/AssignmentsPage/AssignmentsPage";
import { GeneratorPage } from "@/pages/GeneratorPage/GeneratorPage";
import { ItinerariesPage } from "@/pages/ItinerariesPage/ItinerariesPage";
import { LoginPage } from "@/pages/LoginPage/LoginPage";
import { PackagesPage } from "@/pages/PackagesPage/PackagesPage";
import { PeoplePage } from "@/pages/PeoplePage/PeoplePage";
import { RatingsPage } from "@/pages/RatingsPage/RatingsPage";
import { ReportsPage } from "@/pages/ReportsPage/ReportsPage";
import { RequestsPage } from "@/pages/RequestsPage/RequestsPage";
import { TripPage } from "@/pages/TripPage/TripPage";

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  {
    element: <RootLayout />,
    children: [
      { path: "/actividades", element: <ActivitiesPage /> },
      { path: "/itinerarios", element: <ItinerariesPage /> },
      { path: "/itinerarios/nuevo", element: <GeneratorPage /> },
      { path: "/itinerarios/:id", element: <ItinerariesPage /> },
      { path: "/paquetes", element: <PackagesPage /> },
      { path: "/solicitudes", element: <RequestsPage /> },
      { path: "/valoraciones", element: <RatingsPage /> },
      { path: "/viaje/hoy", element: <TripPage /> },
      { path: "/viaje/itinerarios", element: <TripPage /> },
      { path: "/viaje/itinerarios/:id/valorar", element: <TripPage /> },
      { path: "/personas", element: <PeoplePage /> },
      { path: "/asignaciones", element: <AssignmentsPage /> },
      { path: "/reportes/:rc", element: <ReportsPage /> },
    ],
  },
  { path: "*", element: <Navigate to="/login" replace /> },
]);
