import { useState } from "react";
import { Navigate, useNavigate, useParams } from "react-router";
import type { Tone } from "@/components/Alert/tones";
import { Button } from "@/components/Button/Button";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import { usePackages } from "@/lib/api/packages";
import {
  useAuthorizations,
  useCreateGroup,
  useCreateGuide,
  useGuides,
  useSaveAuthorizations,
  useSaveTourist,
  useTravelGroups,
} from "@/lib/api/people";
import type { GroupForm, GroupTourist, GuideForm, TouristForm } from "@/lib/api/people";
import { changedBoxes, changesText, pendingChanges } from "@/lib/people";
import type { PermissionDraft } from "@/lib/people";
import { GroupDrawer } from "./GroupDrawer";
import { GuideDrawer, GuidesTab } from "./GuidesTab";
import { approved, byName } from "./shared";
import { TouristDrawer } from "./TouristDrawer";
import { TouristsTab } from "./TouristsTab";
import "./PeoplePage.css";

type ToastMessage = { tone: Tone; text: string };

type Tab = "guides" | "tourists";

// The side panel open, if any; a null tourist is a new one
type Editor = { kind: "guide" } | { kind: "group" } | { kind: "tourist"; tourist: GroupTourist | null };

const TABS = [
  { key: "guides", label: "Guías y permisos" },
  { key: "tourists", label: "Turistas y grupos" },
];

const SUBTITLES: Record<Tab, string> = {
  guides: "Qué puede hacer cada guía en cada paquete: generar sus itinerarios y validarlos.",
  tourists: "Cada turista pertenece a un grupo de viaje y se inscribe en uno o varios paquetes.",
};

// /people/guides and /people/tourists; one route, so unsaved permissions survive switching tabs
export function PeoplePage() {
  const { tab: tabParam } = useParams();
  const navigate = useNavigate();
  const guides = useGuides();
  const packages = usePackages();
  const authorizations = useAuthorizations(packages.data?.map(pkg => pkg.id));
  const groups = useTravelGroups();
  const saveAuthorizations = useSaveAuthorizations();
  const createGuide = useCreateGuide();
  const createGroup = useCreateGroup();
  const saveTourist = useSaveTourist();
  const [draft, setDraft] = useState<PermissionDraft>({});
  const [editor, setEditor] = useState<Editor | null>(null);
  // Undefined until the user picks a group, so the default follows the loaded data
  const [groupId, setGroupId] = useState<number>();
  const [toast, setToast] = useState<ToastMessage | null>(null);

  if (tabParam !== "guides" && tabParam !== "tourists") return <Navigate to="/people/guides" replace />;

  const tab: Tab = tabParam;
  const saved = authorizations.data ?? [];
  const changes = pendingChanges(saved, draft);
  const changedCount = changedBoxes(saved, changes);
  const selectedGroup = groups.data?.find(group => group.id === groupId) ?? groups.data?.[0];

  function changeTab(key: string) {
    setEditor(null);
    navigate(`/people/${key}`);
  }

  function handleSavePermissions() {
    saveAuthorizations.mutate(changes, {
      onSuccess: () => {
        setDraft({});
        setToast({ tone: "ok", text: `Guardaste los permisos: ${changesText(changedCount)}.` });
      },
      onError: error => setToast({ tone: "bad", text: `No se pudieron guardar los permisos: ${error.message}` }),
    });
  }

  function handleCreateGuide(form: GuideForm) {
    createGuide.mutate(form, {
      onSuccess: guide => {
        setEditor(null);
        setToast({ tone: "ok", text: `Diste de alta a ${guide.name}. Márcale sus permisos en la tabla.` });
      },
      onError: error => setToast({ tone: "bad", text: `No se pudo dar de alta al guía: ${error.message}` }),
    });
  }

  function handleCreateGroup(form: GroupForm) {
    createGroup.mutate(form, {
      onSuccess: group => {
        setGroupId(group.id);
        setEditor(null);
        setToast({ tone: "ok", text: `Creaste el grupo «${group.name}». Ya puedes añadirle turistas.` });
      },
      onError: error => setToast({ tone: "bad", text: `No se pudo crear el grupo: ${error.message}` }),
    });
  }

  function handleSaveTourist(tourist: GroupTourist | null, form: TouristForm) {
    const before = tourist && selectedGroup ? { tourist, travel_group_id: selectedGroup.id } : null;
    const moved = before !== null && before.travel_group_id !== form.travel_group_id;
    const groupName = groups.data?.find(group => group.id === form.travel_group_id)?.name;

    saveTourist.mutate(
      { before, form },
      {
        onSuccess: savedTourist => {
          setGroupId(form.travel_group_id);
          setEditor(null);
          let text = `Guardaste los datos de ${savedTourist.name}.`;
          if (!before) text = `Diste de alta a ${savedTourist.name} en «${groupName}».`;
          else if (moved) text = `Guardaste los datos de ${savedTourist.name}. Ahora está en «${groupName}».`;
          setToast({ tone: "ok", text });
        },
        onError: error => setToast({ tone: "bad", text: `No se pudo guardar el turista: ${error.message}` }),
      },
    );
  }

  const newGroupButton = (
    <Button variant="secondary" icon="plus" onClick={() => setEditor({ kind: "group" })}>
      Nuevo grupo
    </Button>
  );

  const actions =
    tab === "guides" ? (
      <>
        <Button variant="secondary" icon="plus" onClick={() => setEditor({ kind: "guide" })}>
          Nuevo guía
        </Button>
        <Button
          variant="primary"
          disabled={changes.length === 0 || saveAuthorizations.isPending}
          onClick={handleSavePermissions}
        >
          Guardar cambios
        </Button>
      </>
    ) : (
      <>
        {newGroupButton}
        <Button
          variant="primary"
          icon="plus"
          disabled={!selectedGroup}
          onClick={() => setEditor({ kind: "tourist", tourist: null })}
        >
          Nuevo turista
        </Button>
      </>
    );

  let drawer = null;
  if (editor?.kind === "guide") {
    drawer = <GuideDrawer isSaving={createGuide.isPending} onSave={handleCreateGuide} onClose={() => setEditor(null)} />;
  } else if (editor?.kind === "group") {
    drawer = (
      <GroupDrawer
        guides={byName(guides.data ?? [])}
        packages={approved(packages.data ?? [])}
        isSaving={createGroup.isPending}
        onSave={handleCreateGroup}
        onClose={() => setEditor(null)}
      />
    );
  } else if (editor?.kind === "tourist" && selectedGroup) {
    drawer = (
      <TouristDrawer
        // A fresh form for each tourist
        key={editor.tourist?.id ?? "new"}
        tourist={editor.tourist}
        groupId={selectedGroup.id}
        groups={groups.data ?? []}
        packages={packages.data ?? []}
        isSaving={saveTourist.isPending}
        onSave={form => handleSaveTourist(editor.tourist, form)}
        onClose={() => setEditor(null)}
      />
    );
  }

  return (
    <>
      <PageHeader title="Personas" subtitle={SUBTITLES[tab]} actions={actions} />

      <Tabs items={TABS} value={tab} label="Secciones de personas" onChange={changeTab} />

      <div className="people__layout">
        <div className="people__content">
          {tab === "guides" ? (
            <GuidesTab
              guides={guides}
              packages={packages}
              authorizations={authorizations}
              saved={saved}
              draft={draft}
              changedCount={changedCount}
              onChange={(key, permissions) => setDraft(current => ({ ...current, [key]: permissions }))}
              onNewGuide={() => setEditor({ kind: "guide" })}
            />
          ) : (
            <TouristsTab
              groups={groups}
              packages={packages.data ?? []}
              selectedGroup={selectedGroup}
              selectedTouristId={editor?.kind === "tourist" ? editor.tourist?.id : undefined}
              newGroupButton={newGroupButton}
              onSelectGroup={id => {
                setGroupId(id);
                setEditor(null);
              }}
              onEditTourist={tourist => setEditor({ kind: "tourist", tourist })}
            />
          )}
        </div>

        {drawer}
      </div>

      {toast && (
        <div className="people__toast">
          <Toast tone={toast.tone} onClose={() => setToast(null)}>
            {toast.text}
          </Toast>
        </div>
      )}
    </>
  );
}
