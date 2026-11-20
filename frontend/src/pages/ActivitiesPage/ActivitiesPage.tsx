import { useState } from "react";
import type { ReactNode } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { Button } from "@/components/Button/Button";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import { useActivities, useDuplicates } from "@/lib/api/activities";
import { useAttractions } from "@/lib/api/attractions";
import { useCategories } from "@/lib/api/catalogs";
import { BankTab } from "./BankTab";
import { DuplicatesTab } from "./DuplicatesTab";
import type { Selection, ToastMessage } from "./shared";
import "./ActivitiesPage.css";

type Tab = "bank" | "duplicates";

const TABS = [
  { key: "bank", label: "Actividades" },
  { key: "duplicates", label: "Duplicados" },
];

const SUBTITLES = {
  guide: "Todas las actividades de la agencia. Solo puedes clasificar y editar las que describiste tú.",
  admin: "Todas las actividades de la agencia. Las nuevas no se usan en el generador hasta que las validas.",
  duplicates:
    "Posibles duplicados: misma atracción y nombre parecido. Al fusionar, los itinerarios que usaban la eliminada pasan a la que conservas.",
};

// /activities and, for the admin, /activities/duplicates
export function ActivitiesPage() {
  const user = useCurrentUser();
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const isAdmin = user.role === "admin";
  const activities = useActivities();
  const categories = useCategories();
  const attractions = useAttractions();
  const duplicates = useDuplicates(isAdmin);
  const [selection, setSelection] = useState<Selection>(null);
  const [toast, setToast] = useState<ToastMessage | null>(null);

  if (tabParam !== undefined && !(isAdmin && tabParam === "duplicates")) return <Navigate to="/activities" replace />;

  const tab: Tab = tabParam === "duplicates" ? "duplicates" : "bank";
  const pendingPairs = duplicates.data?.filter(pair => pair.status === "pending") ?? [];

  function changeTab(key: string) {
    setSelection(null);
    navigate(key === "duplicates" ? "/activities/duplicates" : "/activities");
  }

  const header = (
    <PageHeader
      title={tab === "duplicates" ? "Actividades duplicadas" : "Banco de actividades"}
      subtitle={tab === "duplicates" ? SUBTITLES.duplicates : isAdmin ? SUBTITLES.admin : SUBTITLES.guide}
      actions={
        !isAdmin && (
          <Button variant="primary" icon="plus" onClick={() => setSelection("new")}>
            Nueva actividad
          </Button>
        )
      }
    />
  );

  const queries = [activities, categories, attractions];
  let content: ReactNode;

  if (queries.some(query => query.isPending)) {
    content = <LoadingPanel rows={8} />;
  } else if (queries.some(query => query.isError) || !activities.data || !categories.data || !attractions.data) {
    const failed = queries.find(query => query.isError);
    content = (
      <LoadError
        title="No se pudieron cargar las actividades"
        error={failed?.error ?? null}
        onRetry={() => queries.forEach(query => query.refetch())}
      />
    );
  } else if (tab === "duplicates") {
    content = <DuplicatesTab duplicates={duplicates} categories={categories.data} onToast={setToast} />;
  } else {
    content = (
      <BankTab
        user={user}
        activities={activities.data}
        categories={categories.data}
        attractions={attractions.data}
        pendingPairs={pendingPairs}
        selection={selection}
        onSelect={setSelection}
        onShowDuplicates={() => changeTab("duplicates")}
        onToast={setToast}
      />
    );
  }

  return (
    <>
      {header}

      {isAdmin && (
        <Tabs
          items={TABS.map(item =>
            item.key === "duplicates" && duplicates.data ? { ...item, count: pendingPairs.length } : item,
          )}
          value={tab}
          label="Secciones del banco de actividades"
          onChange={changeTab}
        />
      )}

      {content}

      {toast && (
        <div className="activities__toast">
          <Toast tone={toast.tone} onClose={() => setToast(null)}>
            {toast.text}
          </Toast>
        </div>
      )}
    </>
  );
}
