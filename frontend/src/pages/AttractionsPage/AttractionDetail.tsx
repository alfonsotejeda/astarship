import { useState } from "react";
import { Link, useNavigate } from "react-router";
import { useCurrentUser } from "@/app/providers/auth/AuthContext";
import { ActivityRow } from "@/components/ActivityRow/ActivityRow";
import { Alert } from "@/components/Alert/Alert";
import { AttractionMap } from "@/components/AttractionMap/AttractionMap";
import { Button } from "@/components/Button/Button";
import { Dialog } from "@/components/Dialog/Dialog";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Toast } from "@/components/Toast/Toast";
import { toRowActivity } from "@/lib/activity";
import { useAttraction, useAttractions, useDeleteAttraction, useSaveAttraction } from "@/lib/api/attractions";
import type { AttractionDetail as Detail, AttractionForm } from "@/lib/api/attractions";
import { useCategories } from "@/lib/api/catalogs";
import { ApiError } from "@/lib/api/client";
import { attractionPoint, TRAVEL_MODE_LABEL } from "@/lib/attraction";
import { AttractionDrawer } from "./AttractionDrawer";

const BREADCRUMB = { label: "Atracciones", to: "/attractions" };

export function AttractionDetail({ id }: { id: number }) {
  const navigate = useNavigate();
  const attraction = useAttraction(id);

  if (attraction.isPending) {
    return (
      <>
        <PageHeader title="Atracción" breadcrumbs={[BREADCRUMB, { label: "…" }]} />
        <LoadingPanel rows={6} />
      </>
    );
  }

  if (attraction.isError) {
    const notFound = attraction.error instanceof ApiError && attraction.error.status === 404;
    return (
      <>
        <PageHeader title="Atracción" breadcrumbs={[BREADCRUMB, { label: "No encontrada" }]} />
        {notFound ? (
          <Panel>
            <EmptyState
              icon="landmark"
              title="Esta atracción no existe"
              action={<Button onClick={() => navigate("/attractions")}>Ver atracciones</Button>}
            />
          </Panel>
        ) : (
          <LoadError title="No se pudo cargar la atracción" error={attraction.error} onRetry={() => attraction.refetch()} />
        )}
      </>
    );
  }

  return <DetailContent attraction={attraction.data} />;
}

function costText(cost: number) {
  return cost === 0 ? "sin coste" : `${cost} USD`;
}

function DetailContent({ attraction }: { attraction: Detail }) {
  const user = useCurrentUser();
  const navigate = useNavigate();
  const attractions = useAttractions();
  const categories = useCategories();
  const saveAttraction = useSaveAttraction();
  const deleteAttraction = useDeleteAttraction();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // The admin edits and deletes; guides only register new ones
  const isAdmin = user.role === "admin";
  const connected = attractions.data?.filter(item =>
    attraction.connections.some(connection => connection.attraction_id === item.id),
  );
  const points = [attractionPoint(attraction, true), ...(connected ?? []).map(item => attractionPoint(item))];

  function handleSave(form: AttractionForm) {
    saveAttraction.mutate(
      { id: attraction.id, form },
      {
        onSuccess: saved => {
          setIsEditing(false);
          setToast(`Guardaste «${saved.name}».`);
        },
      },
    );
  }

  function handleDelete() {
    deleteAttraction.mutate(attraction.id, { onSuccess: () => navigate("/attractions") });
  }

  const categoryName = (categoryId: number | null) => categories.data?.find(item => item.id === categoryId)?.name;

  return (
    <>
      <PageHeader
        title={attraction.name}
        subtitle={attraction.address}
        breadcrumbs={[BREADCRUMB, { label: attraction.name }]}
        actions={
          isAdmin && (
            <>
              <Button variant="ghost" icon="trash" onClick={() => setIsDeleting(true)}>
                Borrar
              </Button>
              <Button variant="primary" onClick={() => setIsEditing(true)}>
                Editar
              </Button>
            </>
          )
        }
      />

      {saveAttraction.isError && (
        <Alert tone="bad" title="No se pudo guardar la atracción" onDismiss={() => saveAttraction.reset()}>
          {saveAttraction.error.message}
        </Alert>
      )}

      <div className="attractions__columns">
        <div className="attractions__main">
          <Panel title="Ubicación" subtitle="En el centro, la atracción; alrededor, las que se conectan con ella." flush>
            <AttractionMap points={points} label={`Mapa de ${attraction.name}`} height={360} className="attractions__map" />
          </Panel>

          <Panel
            title="Actividades"
            subtitle={
              attraction.activities.length === 1
                ? "1 actividad se hace aquí"
                : `${attraction.activities.length} actividades se hacen aquí`
            }
          >
            {attraction.activities.length === 0 ? (
              <EmptyState icon="layers" title="Todavía no hay actividades en esta atracción" />
            ) : (
              <div className="attractions__activities">
                {attraction.activities.map(activity => (
                  // Already on the attraction's page: its name needs no link
                  <ActivityRow
                    key={activity.id}
                    activity={{ ...toRowActivity(activity, categoryName(activity.category_id)), attraction: undefined }}
                  />
                ))}
              </div>
            )}
          </Panel>
        </div>

        <div className="attractions__side">
          <Panel title="Datos">
            <dl className="attractions__facts">
              <div className="attractions__fact">
                <dt className="attractions__eyebrow">Dirección</dt>
                <dd>{attraction.address}</dd>
              </div>
              <div className="attractions__fact">
                <dt className="attractions__eyebrow">Coordenadas</dt>
                <dd className="attractions__mono">
                  {attraction.latitude.toFixed(4)}, {attraction.longitude.toFixed(4)}
                </dd>
              </div>
            </dl>
          </Panel>

          {/* RF-32: the network these come from is kept outside the relational schema */}
          <Panel title="Cómo llegar desde aquí" subtitle="Atracciones conectadas, con su tiempo y su coste.">
            {attraction.connections.length === 0 ? (
              <p className="attractions__muted">No tiene conexiones con otras atracciones.</p>
            ) : (
              <ul className="attractions__connections">
                {attraction.connections.map(connection => (
                  <li key={connection.attraction_id} className="attractions__connection">
                    <Link to={`/attractions/${connection.attraction_id}`} className="attractions__link">
                      {connection.name}
                    </Link>
                    <span className="attractions__muted">
                      {connection.minutes} min · {TRAVEL_MODE_LABEL[connection.mode].toLowerCase()} · {costText(connection.cost)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        {isEditing && (
          <AttractionDrawer
            attraction={attraction}
            attractions={attractions.data ?? []}
            isSaving={saveAttraction.isPending}
            onSave={handleSave}
            onClose={() => setIsEditing(false)}
          />
        )}
      </div>

      {isDeleting && (
        <Dialog
          open
          title={`¿Borrar «${attraction.name}»?`}
          onClose={() => setIsDeleting(false)}
          actions={
            <>
              <Button variant="ghost" onClick={() => setIsDeleting(false)}>
                Cancelar
              </Button>
              <Button
                variant="danger"
                disabled={deleteAttraction.isPending || attraction.activities.length > 0}
                onClick={handleDelete}
              >
                {deleteAttraction.isPending ? "Borrando…" : "Borrar atracción"}
              </Button>
            </>
          }
        >
          {attraction.activities.length > 0 ? (
            <Alert tone="warn">
              Aquí se hacen {attraction.activities.length === 1 ? "1 actividad" : `${attraction.activities.length} actividades`}.
              Cámbialas de atracción antes de borrarla.
            </Alert>
          ) : (
            <p className="attractions__text">Desaparecerá del mapa y de la red de conexiones. No se puede deshacer.</p>
          )}
          {deleteAttraction.isError && (
            <Alert tone="bad" title="No se pudo borrar">
              {deleteAttraction.error.message}
            </Alert>
          )}
        </Dialog>
      )}

      {toast && (
        <div className="attractions__toast">
          <Toast key={toast} tone="ok" onClose={() => setToast(null)}>
            {toast}
          </Toast>
        </div>
      )}
    </>
  );
}
