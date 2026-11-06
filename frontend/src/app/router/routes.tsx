import { createBrowserRouter, Navigate } from "react-router";
import type { RouteObject } from "react-router";
import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { ALL_ROLES, HOME_BY_ROLE } from "@/app/providers/auth/roles";
import type { Role } from "@/app/providers/auth/roles";
import { AppShell } from "@/components/AppShell/AppShell";
import { ActivitiesPage } from "@/pages/ActivitiesPage/ActivitiesPage";
import { AssignmentsPage } from "@/pages/AssignmentsPage/AssignmentsPage";
import { AttractionsPage } from "@/pages/AttractionsPage/AttractionsPage";
import { CatalogPage } from "@/pages/CatalogPage/CatalogPage";
import { GeneratorPage } from "@/pages/GeneratorPage/GeneratorPage";
import { ItinerariesPage } from "@/pages/ItinerariesPage/ItinerariesPage";
import { LoginPage } from "@/pages/LoginPage/LoginPage";
import { NotFoundPage } from "@/pages/NotFoundPage/NotFoundPage";
import { PackagesPage } from "@/pages/PackagesPage/PackagesPage";
import { PeoplePage } from "@/pages/PeoplePage/PeoplePage";
import { PreviewPage } from "@/pages/PreviewPage/PreviewPage";
import { RatingsPage } from "@/pages/RatingsPage/RatingsPage";
import { ReportsPage } from "@/pages/ReportsPage/ReportsPage";
import { RequestsPage } from "@/pages/RequestsPage/RequestsPage";
import { TripPage } from "@/pages/TripPage/TripPage";
import { RequireRole } from "./RequireRole";

function Home() {
  const user = useCurrentUser();
  return <Navigate to={HOME_BY_ROLE[user.role]} replace />;
}

// The roles that may open each route (RNF-10); the rest are sent to their home
function only(roles: Role[], children: RouteObject[]): RouteObject {
  return { element: <RequireRole roles={roles} />, children };
}

export const router = createBrowserRouter([
  { path: "/login", element: <LoginPage /> },
  { path: "/preview/:name?", element: <PreviewPage /> },
  {
    element: <AppShell />,
    children: [
      { path: "/", element: <Home /> },
      only(["guide", "admin"], [{ path: "/activities/:tab?", element: <ActivitiesPage /> }]),
      only(ALL_ROLES, [
        { path: "/attractions", element: <AttractionsPage /> },
        { path: "/attractions/:id", element: <AttractionsPage /> },
        { path: "/reports", element: <Navigate to="/reports/rc1" replace /> },
        { path: "/reports/:rc", element: <ReportsPage /> },
      ]),
      only(["guide", "manager"], [
        { path: "/itineraries", element: <ItinerariesPage /> },
        { path: "/itineraries/:id", element: <ItinerariesPage /> },
      ]),
      only(["guide"], [{ path: "/itineraries/new", element: <GeneratorPage /> }]),
      only(["admin", "guide", "manager"], [{ path: "/packages", element: <PackagesPage /> }]),
      only(["guide", "tourist"], [
        { path: "/requests", element: <RequestsPage /> },
        { path: "/ratings", element: <RatingsPage /> },
      ]),
      only(["tourist"], [
        { path: "/trip", element: <Navigate to="/trip/today" replace /> },
        { path: "/trip/today", element: <TripPage view="today" /> },
        { path: "/trip/itineraries", element: <TripPage view="trips" /> },
        { path: "/trip/itineraries/:id", element: <TripPage view="detail" /> },
        { path: "/trip/itineraries/:id/rate", element: <TripPage view="rate" /> },
        { path: "/catalog", element: <CatalogPage /> },
        { path: "/catalog/:packageId", element: <CatalogPage /> },
      ]),
      only(["admin"], [
        { path: "/people", element: <Navigate to="/people/guides" replace /> },
        { path: "/people/:tab", element: <PeoplePage /> },
        { path: "/assignments/:tab?", element: <AssignmentsPage /> },
      ]),
      { path: "*", element: <NotFoundPage /> },
    ],
  },
], { basename: import.meta.env.BASE_URL });
