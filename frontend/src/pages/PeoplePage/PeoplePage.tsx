import { useState } from "react";
import type { ReactNode } from "react";
import { Link, Navigate, useSearchParams } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import type { Tone } from "@/components/Alert/tones";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { ChipSelect } from "@/components/ChipSelect/ChipSelect";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { Drawer } from "@/components/Drawer/Drawer";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Tabs } from "@/components/Tabs/Tabs";
import { Toast } from "@/components/Toast/Toast";
import { usePackages } from "@/lib/api/packages";
import type { Package } from "@/lib/api/packages";
import {
  useAuthorizations,
  useCreateGroup,
  useCreateGuide,
  useGroupTourists,
  useGuides,
  useSaveAuthorizations,
  useSaveTourist,
  useTravelGroups,
} from "@/lib/api/people";
import type {
  Authorization,
  GroupForm,
  GroupTourist,
  Guide,
  GuideForm,
  TouristForm,
  TravelGroup,
} from "@/lib/api/people";
import { formatDateRange, formatItineraryCode } from "@/lib/format";
import { exportPdf } from "@/lib/pdf";
import {
  authorizationKey,
  changedBoxes,
  changesText,
  emailError,
  matchesTourist,
  passwordError,
  pendingChanges,
  savedPermissions,
} from "@/lib/people";
import type { PermissionDraft, Permissions } from "@/lib/people";
import "./PeoplePage.css";

type ToastMessage = { tone: Tone; text: string };

type Tab = "guias" | "turistas";

// The side panel open, if any; a null tourist is a new one
type Editor = { kind: "guide" } | { kind: "group" } | { kind: "tourist"; tourist: GroupTourist | null };

type QueryState<T> = {
  data?: T;
  isPending: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => unknown;
};

const TABS = [
  { key: "guias", label: "Guías y permisos" },
  { key: "turistas", label: "Turistas y grupos" },
];

const SUBTITLES: Record<Tab, string> = {
  guias: "Qué puede hacer cada guía en cada paquete: generar sus itinerarios y validarlos.",
  turistas: "Cada turista pertenece a un grupo de viaje y se inscribe en uno o varios paquetes.",
};

const PERMISSION_KINDS: { key: keyof Permissions; label: string; verb: string }[] = [
  { key: "can_generate", label: "Genera", verb: "genera itinerarios en" },
  { key: "can_validate", label: "Valida", verb: "valida itinerarios en" },
];

function byName<T extends { name: string }>(items: T[]) {
  return [...items].sort((a, b) => a.name.localeCompare(b.name, "es"));
}

// RN-09: only a validated package admits enrolments and groups
function approved(packages: Package[]) {
  return byName(packages.filter(pkg => pkg.status === "approved"));
}

function touristsText(count: number) {
  return count === 1 ? "1 turista" : `${count} turistas`;
}

export function PeoplePage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const guides = useGuides();
  const packages = usePackages();
  const authorizations = useAuthorizations(packages.data?.map(pkg => pkg.id));
  const groups = useTravelGroups();
  const saveAuthorizations = useSaveAuthorizations();
  const createGuide = useCreateGuide();
  const createGroup = useCreateGroup();
  const saveTourist = useSaveTourist();
  // Kept here so switching tabs does not lose unsaved permissions
  const [draft, setDraft] = useState<PermissionDraft>({});
  const [editor, setEditor] = useState<Editor | null>(null);
  // Undefined until the user picks a group, so the default follows the loaded data
  const [groupId, setGroupId] = useState<number>();
  const [toast, setToast] = useState<ToastMessage | null>(null);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role !== "admin") return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const tab: Tab = searchParams.get("tab") === "turistas" ? "turistas" : "guias";
  const saved = authorizations.data ?? [];
  const changes = pendingChanges(saved, draft);
  const changedCount = changedBoxes(saved, changes);
  const selectedGroup = groups.data?.find(group => group.id === groupId) ?? groups.data?.[0];

  function changeTab(key: string) {
    setEditor(null);
    setSearchParams(key === "guias" ? {} : { tab: key }, { replace: true });
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
        onSuccess: saved => {
          setGroupId(form.travel_group_id);
          setEditor(null);
          let text = `Guardaste los datos de ${saved.name}.`;
          if (!before) text = `Diste de alta a ${saved.name} en «${groupName}».`;
          else if (moved) text = `Guardaste los datos de ${saved.name}. Ahora está en «${groupName}».`;
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
    tab === "guias" ? (
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
          {tab === "guias" ? (
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

type GuidesTabProps = {
  guides: QueryState<Guide[]>;
  packages: QueryState<Package[]>;
  authorizations: QueryState<Authorization[]>;
  saved: Authorization[];
  draft: PermissionDraft;
  changedCount: number;
  onChange: (key: string, permissions: Permissions) => void;
  onNewGuide: () => void;
};

function GuidesTab({
  guides,
  packages,
  authorizations,
  saved,
  draft,
  changedCount,
  onChange,
  onNewGuide,
}: GuidesTabProps) {
  const failed = [guides, packages, authorizations].find(query => query.isError);
  if (failed) {
    return <LoadError title="No se pudieron cargar los permisos" error={failed.error} onRetry={() => failed.refetch()} />;
  }
  if (guides.isPending || packages.isPending || authorizations.isPending) return <LoadingPanel />;

  const guideRows = byName(guides.data ?? []);
  const packageColumns = byName(packages.data ?? []);

  if (guideRows.length === 0 || packageColumns.length === 0) {
    return (
      <Panel>
        {guideRows.length === 0 ? (
          <EmptyState
            icon="users"
            title="Todavía no hay guías"
            action={
              <Button variant="primary" icon="plus" onClick={onNewGuide}>
                Nuevo guía
              </Button>
            }
          >
            Da de alta al primero y después márcale los permisos en cada paquete.
          </EmptyState>
        ) : (
          <EmptyState
            icon="package"
            title="Todavía no hay paquetes"
            action={
              <Link to="/paquetes" className="people__link">
                Ir a Paquetes
              </Link>
            }
          >
            Crea un paquete para poder dar permisos sobre él.
          </EmptyState>
        )}
      </Panel>
    );
  }

  function current(guideId: number, packageId: number): Permissions {
    return draft[authorizationKey(guideId, packageId)] ?? savedPermissions(saved, guideId, packageId);
  }

  function isChanged(guideId: number, packageId: number) {
    const now = current(guideId, packageId);
    const before = savedPermissions(saved, guideId, packageId);
    return now.can_generate !== before.can_generate || now.can_validate !== before.can_validate;
  }

  function handleExport() {
    exportPdf({
      title: "Guías y permisos",
      filter: `${guideRows.length} guías · ${packageColumns.length} paquetes`,
      columns: ["Guía", ...packageColumns.flatMap(pkg => PERMISSION_KINDS.map(kind => `${pkg.name} · ${kind.label}`))],
      rows: guideRows.map(guide => [
        guide.name,
        ...packageColumns.flatMap(pkg => {
          const permissions = current(guide.id, pkg.id);
          return PERMISSION_KINDS.map(kind => (permissions[kind.key] ? "Sí" : "—"));
        }),
      ]),
    });
  }

  return (
    <>
      <div className="people__legend">
        <div className="people__legend-item">
          <span className="people__legend-title">Genera</span>
          <span className="people__muted">Generar itinerarios del paquete y enviarlos a revisión.</span>
        </div>
        <div className="people__legend-item">
          <span className="people__legend-title">Valida</span>
          <span className="people__muted">Aprobar, devolver o pedir otro itinerario del paquete.</span>
        </div>
      </div>

      <Alert tone="info">
        Nadie valida lo que ha hecho: un guía con los dos permisos en un paquete no puede validar los itinerarios que él
        mismo genera.
      </Alert>

      {changedCount > 0 && (
        <Alert tone="warn" title="Cambios sin guardar">
          {changesText(changedCount)}. Guarda para que se apliquen.
        </Alert>
      )}

      <Panel
        title="Autorizaciones"
        subtitle={`${guideRows.length} guías · ${packageColumns.length} paquetes`}
        actions={
          <Button size="sm" icon="download" onClick={handleExport}>
            Exportar PDF
          </Button>
        }
        flush
      >
        <div className="people__matrix-scroll">
          <table className="people__matrix">
            <caption className="people__sr-only">Permisos de cada guía en cada paquete</caption>
            <thead>
              <tr>
                <th scope="col" rowSpan={2} className="people__guide-head">
                  Guía
                </th>
                {packageColumns.map(pkg => (
                  <th key={pkg.id} scope="colgroup" colSpan={2} className="people__package-head">
                    {pkg.name}
                  </th>
                ))}
              </tr>
              <tr>
                {packageColumns.flatMap(pkg =>
                  PERMISSION_KINDS.map(kind => (
                    <th
                      key={`${pkg.id}-${kind.key}`}
                      scope="col"
                      className={kind.key === "can_generate" ? "people__sub-head people__cell--start" : "people__sub-head"}
                    >
                      {kind.label}
                    </th>
                  )),
                )}
              </tr>
            </thead>
            <tbody>
              {guideRows.map(guide => (
                <tr key={guide.id}>
                  <th scope="row" className="people__guide">
                    <span className="people__guide-text">
                      <span className="people__guide-name">{guide.name}</span>
                      <span className="people__muted">{guide.specialty ? `Guía · ${guide.specialty}` : "Guía"}</span>
                    </span>
                  </th>
                  {packageColumns.flatMap(pkg => {
                    const permissions = current(guide.id, pkg.id);
                    const changed = isChanged(guide.id, pkg.id);

                    return PERMISSION_KINDS.map(kind => {
                      const classes = [
                        "people__cell",
                        kind.key === "can_generate" && "people__cell--start",
                        changed && "people__cell--changed",
                      ]
                        .filter(Boolean)
                        .join(" ");

                      return (
                        <td key={`${pkg.id}-${kind.key}`} className={classes}>
                          <Checkbox
                            aria-label={`${guide.name} ${kind.verb} ${pkg.name}`}
                            checked={permissions[kind.key]}
                            onChange={event =>
                              onChange(authorizationKey(guide.id, pkg.id), {
                                ...permissions,
                                [kind.key]: event.target.checked,
                              })
                            }
                          />
                        </td>
                      );
                    });
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}

type TouristsTabProps = {
  groups: QueryState<TravelGroup[]>;
  packages: Package[];
  selectedGroup?: TravelGroup;
  selectedTouristId?: number;
  newGroupButton: ReactNode;
  onSelectGroup: (id: number) => void;
  onEditTourist: (tourist: GroupTourist) => void;
};

function TouristsTab({
  groups,
  packages,
  selectedGroup,
  selectedTouristId,
  newGroupButton,
  onSelectGroup,
  onEditTourist,
}: TouristsTabProps) {
  if (groups.isError) {
    return (
      <LoadError title="No se pudieron cargar los grupos" error={groups.error} onRetry={() => groups.refetch()} />
    );
  }
  if (groups.isPending) return <LoadingPanel />;

  if (!selectedGroup) {
    return (
      <Panel>
        <EmptyState icon="users" title="Todavía no hay grupos de viaje" action={newGroupButton}>
          Los turistas viajan siempre en un grupo: crea el primero para poder darlos de alta.
        </EmptyState>
      </Panel>
    );
  }

  return (
    <div className="people__columns">
      <nav aria-label="Grupos de viaje" className="people__groups">
        <span className="people__eyebrow">Grupos de viaje</span>
        {(groups.data ?? []).map(group => {
          const isSelected = group.id === selectedGroup.id;

          return (
            <button
              key={group.id}
              type="button"
              className={isSelected ? "people__group people__group--selected" : "people__group"}
              aria-pressed={isSelected}
              onClick={() => onSelectGroup(group.id)}
            >
              <span className="people__group-name">{group.name}</span>
              <span className="people__muted">
                {group.package_name} · {touristsText(group.tourist_count)}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="people__main">
        {/* A fresh set of filters for each group */}
        <GroupTourists
          key={selectedGroup.id}
          group={selectedGroup}
          packages={packages}
          selectedTouristId={selectedTouristId}
          onEditTourist={onEditTourist}
        />
      </div>
    </div>
  );
}

type GroupTouristsProps = {
  group: TravelGroup;
  packages: Package[];
  selectedTouristId?: number;
  onEditTourist: (tourist: GroupTourist) => void;
};

function GroupTourists({ group, packages, selectedTouristId, onEditTourist }: GroupTouristsProps) {
  const tourists = useGroupTourists(group.id);
  const [query, setQuery] = useState("");
  const [packageId, setPackageId] = useState("");

  if (tourists.isPending) return <LoadingPanel />;
  if (tourists.isError) {
    return (
      <LoadError
        title="No se pudieron cargar los turistas del grupo"
        error={tourists.error}
        onRetry={() => tourists.refetch()}
      />
    );
  }

  const rows = tourists.data.filter(tourist => matchesTourist(tourist, query, packageId));

  function resetFilters() {
    setQuery("");
    setPackageId("");
  }

  const columns: Column<GroupTourist>[] = [
    {
      key: "name",
      label: "Turista",
      render: tourist => <span className="people__guide-name">{tourist.name}</span>,
    },
    { key: "age", label: "Edad", align: "right" },
    {
      key: "packages",
      label: "Paquetes inscritos",
      sortable: false,
      render: tourist => (
        <span className="people__badges">
          {tourist.packages.map(pkg => (
            <Badge key={pkg.id} tone="category">
              {pkg.name}
            </Badge>
          ))}
        </span>
      ),
      exportValue: tourist => tourist.packages.map(pkg => pkg.name).join(", "),
    },
    {
      key: "itinerary",
      label: "Itinerario asignado",
      render: tourist =>
        tourist.itinerary_id === null ? (
          <StatusPill status="solicitada">Sin asignar</StatusPill>
        ) : (
          <span className="people__mono">{formatItineraryCode(tourist.itinerary_id)}</span>
        ),
      sortValue: tourist => tourist.itinerary_id,
      exportValue: tourist =>
        tourist.itinerary_id === null ? "Sin asignar" : formatItineraryCode(tourist.itinerary_id),
    },
  ];

  return (
    <>
      <FilterBar summary={touristsText(rows.length)} onReset={resetFilters}>
        <Field
          id="people-query"
          label="Buscar turista"
          placeholder="Nombre"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Field
          id="people-package"
          label="Inscrito en"
          options={[
            { value: "", label: "Cualquier paquete" },
            ...byName(packages).map(pkg => ({ value: String(pkg.id), label: pkg.name })),
          ]}
          value={packageId}
          onChange={event => setPackageId(event.target.value)}
        />
      </FilterBar>

      <DataTable
        title={group.name}
        subtitle={`${group.package_name} · ${formatDateRange(group.start_date, group.end_date)} · Guía: ${group.guide_name}`}
        columns={columns}
        rows={rows}
        defaultSort={{ key: "name", dir: "asc" }}
        onRowClick={onEditTourist}
        selectedKey={selectedTouristId}
        exportable
        footer="Pulsa un turista para editarlo."
        emptyText={
          tourists.data.length === 0 ? "Este grupo todavía no tiene turistas." : "No hay turistas con estos filtros."
        }
      />
    </>
  );
}

type GuideDrawerProps = {
  isSaving: boolean;
  onSave: (form: GuideForm) => void;
  onClose: () => void;
};

function GuideDrawer({ isSaving, onSave, onClose }: GuideDrawerProps) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const errors = {
    name: name.trim() ? undefined : "Escribe el nombre del guía.",
    email: emailError(email),
    password: passwordError(password),
    specialty: specialty.trim() ? undefined : "Escribe su especialidad.",
  };

  function save() {
    if (Object.values(errors).some(Boolean)) {
      setShowErrors(true);
      return;
    }
    onSave({ name: name.trim(), email: email.trim(), password, specialty: specialty.trim() });
  }

  return (
    <Drawer
      title="Nuevo guía"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={isSaving} onClick={save}>
            Dar de alta
          </Button>
        </>
      }
    >
      <Alert tone="info">Entra con este email y esta contraseña. Al darlo de alta no tiene permisos en ningún paquete.</Alert>
      <Field
        id="guide-name"
        label="Nombre"
        required
        value={name}
        error={showErrors ? errors.name : undefined}
        onChange={event => setName(event.target.value)}
      />
      <Field
        id="guide-email"
        label="Email"
        type="email"
        required
        value={email}
        error={showErrors ? errors.email : undefined}
        onChange={event => setEmail(event.target.value)}
      />
      <Field
        id="guide-password"
        label="Contraseña inicial"
        type="password"
        required
        autoComplete="new-password"
        hint="Al menos 8 caracteres."
        value={password}
        error={showErrors ? errors.password : undefined}
        onChange={event => setPassword(event.target.value)}
      />
      <Field
        id="guide-specialty"
        label="Especialidad"
        required
        placeholder="Patrimonio colonial"
        value={specialty}
        error={showErrors ? errors.specialty : undefined}
        onChange={event => setSpecialty(event.target.value)}
      />
    </Drawer>
  );
}

type GroupDrawerProps = {
  guides: Guide[];
  // Only validated packages
  packages: Package[];
  isSaving: boolean;
  onSave: (form: GroupForm) => void;
  onClose: () => void;
};

function GroupDrawer({ guides, packages, isSaving, onSave, onClose }: GroupDrawerProps) {
  const [name, setName] = useState("");
  const [guideId, setGuideId] = useState(String(guides[0]?.id ?? ""));
  const [packageId, setPackageId] = useState(String(packages[0]?.id ?? ""));
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showErrors, setShowErrors] = useState(false);

  const canCreate = guides.length > 0 && packages.length > 0;
  const errors = {
    name: name.trim() ? undefined : "Escribe el nombre del grupo.",
    startDate: startDate ? undefined : "Elige el día en que empieza el viaje.",
    endDate: !endDate
      ? "Elige el día en que termina el viaje."
      : startDate && endDate < startDate
        ? "Termina antes de empezar."
        : undefined,
  };

  function save() {
    if (Object.values(errors).some(Boolean)) {
      setShowErrors(true);
      return;
    }
    onSave({
      name: name.trim(),
      guide_id: Number(guideId),
      package_id: Number(packageId),
      start_date: startDate,
      end_date: endDate,
    });
  }

  return (
    <Drawer
      title="Nuevo grupo"
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={isSaving || !canCreate} onClick={save}>
            Crear grupo
          </Button>
        </>
      }
    >
      {guides.length === 0 && <Alert tone="warn">Da de alta antes a un guía: cada grupo viaja con uno.</Alert>}
      {packages.length === 0 && (
        <Alert tone="warn">No hay paquetes validados. Un paquete sin validar no admite grupos ni inscripciones.</Alert>
      )}

      <Field
        id="group-name"
        label="Nombre"
        required
        placeholder="Habana Noviembre A"
        value={name}
        error={showErrors ? errors.name : undefined}
        onChange={event => setName(event.target.value)}
      />
      <Field
        id="group-guide"
        label="Guía"
        required
        options={guides.map(guide => ({ value: String(guide.id), label: guide.name }))}
        value={guideId}
        disabled={guides.length === 0}
        onChange={event => setGuideId(event.target.value)}
      />
      <Field
        id="group-package"
        label="Paquete"
        required
        hint="Solo paquetes validados."
        options={packages.map(pkg => ({ value: String(pkg.id), label: pkg.name }))}
        value={packageId}
        disabled={packages.length === 0}
        onChange={event => setPackageId(event.target.value)}
      />
      <div className="people__dates">
        <Field
          id="group-start"
          label="Empieza"
          type="date"
          required
          value={startDate}
          error={showErrors ? errors.startDate : undefined}
          onChange={event => setStartDate(event.target.value)}
        />
        <Field
          id="group-end"
          label="Termina"
          type="date"
          required
          min={startDate || undefined}
          value={endDate}
          error={showErrors ? errors.endDate : undefined}
          onChange={event => setEndDate(event.target.value)}
        />
      </div>
    </Drawer>
  );
}

type TouristDrawerProps = {
  // Null while creating a new tourist
  tourist: GroupTourist | null;
  groupId: number;
  groups: TravelGroup[];
  packages: Package[];
  isSaving: boolean;
  onSave: (form: TouristForm) => void;
  onClose: () => void;
};

function TouristDrawer({ tourist, groupId, groups, packages, isSaving, onSave, onClose }: TouristDrawerProps) {
  const isNew = tourist === null;
  const [name, setName] = useState(tourist?.name ?? "");
  const [email, setEmail] = useState(tourist?.email ?? "");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState(tourist ? String(tourist.age) : "");
  const [travelGroupId, setTravelGroupId] = useState(String(groupId));
  // A new tourist starts enrolled in its group's package
  const [packageIds, setPackageIds] = useState(
    tourist?.packages.map(pkg => pkg.id) ?? [groups.find(group => group.id === groupId)?.package_id ?? 0].filter(Boolean),
  );
  const [showErrors, setShowErrors] = useState(false);

  const ageValue = Number(age);
  const errors = {
    name: name.trim() ? undefined : "Escribe el nombre del turista.",
    email: emailError(email),
    password: isNew ? passwordError(password) : undefined,
    age: age && Number.isInteger(ageValue) && ageValue >= 0 && ageValue <= 120 ? undefined : "Escribe una edad entre 0 y 120.",
  };

  // Validated packages, plus any it is already enrolled in so they can still be removed
  const enrolledIds = tourist?.packages.map(pkg => pkg.id) ?? [];
  const packageOptions = byName(packages.filter(pkg => pkg.status === "approved" || enrolledIds.includes(pkg.id)));
  const group = groups.find(item => item.id === Number(travelGroupId));

  function save() {
    if (Object.values(errors).some(Boolean)) {
      setShowErrors(true);
      return;
    }
    onSave({
      name: name.trim(),
      email: email.trim(),
      password,
      age: ageValue,
      travel_group_id: Number(travelGroupId),
      package_ids: packageIds,
    });
  }

  return (
    <Drawer
      title={tourist?.name ?? "Nuevo turista"}
      meta={
        tourist?.itinerary_id != null && (
          <span className="people__muted">Tiene asignado {formatItineraryCode(tourist.itinerary_id)}</span>
        )
      }
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={isSaving} onClick={save}>
            {isNew ? "Dar de alta" : "Guardar turista"}
          </Button>
        </>
      }
    >
      <Field
        id="tourist-name"
        label="Nombre"
        required
        value={name}
        error={showErrors ? errors.name : undefined}
        onChange={event => setName(event.target.value)}
      />
      <Field
        id="tourist-email"
        label="Email"
        type="email"
        required
        value={email}
        error={showErrors ? errors.email : undefined}
        onChange={event => setEmail(event.target.value)}
      />
      {isNew && (
        <Field
          id="tourist-password"
          label="Contraseña inicial"
          type="password"
          required
          autoComplete="new-password"
          hint="Al menos 8 caracteres."
          value={password}
          error={showErrors ? errors.password : undefined}
          onChange={event => setPassword(event.target.value)}
        />
      )}
      <Field
        id="tourist-age"
        label="Edad"
        type="number"
        required
        min={0}
        max={120}
        value={age}
        error={showErrors ? errors.age : undefined}
        onChange={event => setAge(event.target.value)}
      />
      <Field
        id="tourist-group"
        label="Grupo de viaje"
        required
        hint={group ? `${group.package_name} · ${formatDateRange(group.start_date, group.end_date)}` : undefined}
        options={groups.map(item => ({ value: String(item.id), label: item.name }))}
        value={travelGroupId}
        onChange={event => setTravelGroupId(event.target.value)}
      />

      <div className="people__field-group">
        <span className="people__field-label">Paquetes inscritos</span>
        <ChipSelect
          label="Paquetes inscritos"
          options={packageOptions.map(pkg => ({ value: String(pkg.id), label: pkg.name }))}
          value={packageIds.map(String)}
          onChange={value => setPackageIds(value.map(Number))}
        />
        <span className="people__muted">
          Solo paquetes validados. Para quitar un paquete en el que ya tiene itinerario asignado, quita antes la
          asignación.
        </span>
      </div>
    </Drawer>
  );
}
