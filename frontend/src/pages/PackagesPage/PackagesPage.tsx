import { useState } from "react";
import { Link, Navigate } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import type { Role } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import type { Tone } from "@/components/Alert/tones";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { ChipSelect } from "@/components/ChipSelect/ChipSelect";
import { DataTable } from "@/components/DataTable/DataTable";
import type { Column } from "@/components/DataTable/DataTable";
import { Drawer } from "@/components/Drawer/Drawer";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { FilterBar } from "@/components/FilterBar/FilterBar";
import { Icon } from "@/components/Icon/Icon";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import { Toast } from "@/components/Toast/Toast";
import { useCategories } from "@/lib/api/catalogs";
import type { Category } from "@/lib/api/catalogs";
import { usePackages, useSavePackage, useValidatePackage } from "@/lib/api/packages";
import type { Package, PackageForm, PackageValidationResult } from "@/lib/api/packages";
import {
  matchesSearch,
  permissionLabels,
  STATUS_OPTIONS,
  STATUS_ORDER,
  STATUS_PILL,
  validationChecks,
  validationText,
} from "@/lib/package";
import "./PackagesPage.css";

type ToastMessage = { tone: Tone; text: string };

// A package id, "new" while creating one, or null with the drawer closed
type Selection = number | "new" | null;

const SUBTITLES: Partial<Record<Role, string>> = {
  admin: "Destino, categorías a cubrir, personas con permisos y estado de validación.",
  guide: "Los paquetes en los que tienes algún permiso. Solo el administrador puede editarlos.",
  manager: "Los paquetes que puedes validar. Un paquete validado admite itinerarios e inscripciones.",
};

const SHOWN_CATEGORIES = 3;

// The manager starts on the first package to validate; the rest, on the first one by name
function defaultSelection(packages: Package[], role: Role): Selection {
  if (role === "manager") return packages.find(pkg => pkg.can_validate)?.id ?? null;
  return [...packages].sort((a, b) => a.name.localeCompare(b.name))[0]?.id ?? null;
}

function pendingTitle(count: number) {
  return count === 1 ? "1 paquete pendiente de validar" : `${count} paquetes pendientes de validar`;
}

function sameCategories(a: number[], b: number[]) {
  return [...a].sort().join() === [...b].sort().join();
}

export function PackagesPage() {
  const { user } = useAuth();
  const packages = usePackages();
  const categories = useCategories();
  const savePackage = useSavePackage();
  const validatePackage = useValidatePackage();
  // Undefined until the user picks a row, so the default follows the loaded data
  const [selection, setSelection] = useState<Selection>();
  const [toast, setToast] = useState<ToastMessage | null>(null);

  if (!user) return <Navigate to="/login" replace />;
  if (user.role === "tourist") return <Navigate to={HOME_BY_ROLE[user.role]} replace />;

  const isAdmin = user.role === "admin";

  const header = (
    <PageHeader
      title={isAdmin ? "Paquetes turísticos" : "Paquetes"}
      subtitle={SUBTITLES[user.role]}
      actions={
        isAdmin && (
          <Button variant="primary" icon="plus" onClick={() => setSelection("new")}>
            Nuevo paquete
          </Button>
        )
      }
    />
  );

  const toastElement = toast && (
    <div className="packages__toast">
      <Toast tone={toast.tone} onClose={() => setToast(null)}>
        {toast.text}
      </Toast>
    </div>
  );

  if (packages.isPending || categories.isPending) {
    return (
      <>
        {header}
        <LoadingPanel />
      </>
    );
  }

  if (packages.isError || categories.isError) {
    const failed = packages.isError ? packages : categories;
    return (
      <>
        {header}
        <LoadError title="No se pudieron cargar los paquetes" error={failed.error} onRetry={() => failed.refetch()} />
      </>
    );
  }

  const data = packages.data;
  const current = selection === undefined ? defaultSelection(data, user.role) : selection;
  const selected = typeof current === "number" ? data.find(pkg => pkg.id === current) : undefined;
  const isDrawerOpen = current === "new" || selected !== undefined;
  const pending = data.filter(pkg => pkg.status === "pending").length;

  function handleSave(form: PackageForm) {
    const id = selected?.id ?? null;
    const wasApproved = selected?.status === "approved";

    savePackage.mutate(
      { id, form },
      {
        onSuccess: saved => {
          setSelection(saved.id);
          if (id === null) setToast({ tone: "ok", text: `Creaste «${saved.name}». Queda sin validar.` });
          else if (wasApproved && saved.status === "pending") {
            setToast({ tone: "warn", text: `Guardaste «${saved.name}». Vuelve a quedar pendiente de validar.` });
          } else setToast({ tone: "ok", text: `Guardaste «${saved.name}».` });
        },
        onError: error => setToast({ tone: "bad", text: `No se pudo guardar el paquete: ${error.message}` }),
      },
    );
  }

  function handleValidate(result: PackageValidationResult, observations: string) {
    if (!selected) return;

    validatePackage.mutate(
      { id: selected.id, body: { result, observations } },
      {
        onSuccess: validated => {
          // Keeps it open: the default would jump to the next package to validate
          setSelection(validated.id);
          setToast({
            tone: "ok",
            text:
              result === "approved"
                ? `Validaste «${validated.name}». Ya admite itinerarios e inscripciones.`
                : `Devolviste «${validated.name}» con tus observaciones.`,
          });
        },
        onError: error => setToast({ tone: "bad", text: `No se pudo registrar la validación: ${error.message}` }),
      },
    );
  }

  if (data.length === 0 && current !== "new") {
    return (
      <>
        {header}
        <Panel>
          {isAdmin ? (
            <EmptyState
              icon="package"
              title="Todavía no hay paquetes"
              action={
                <Button variant="primary" icon="plus" onClick={() => setSelection("new")}>
                  Nuevo paquete
                </Button>
              }
            >
              Crea el primero: quedará sin validar hasta que lo valide el jefe de operaciones.
            </EmptyState>
          ) : (
            <EmptyState icon="package" title="Todavía no tienes permisos en ningún paquete">
              El administrador los concede en Guías y permisos.
            </EmptyState>
          )}
        </Panel>
        {toastElement}
      </>
    );
  }

  return (
    <>
      {header}

      {user.role === "manager" && pending > 0 && (
        <Alert tone="warn" title={pendingTitle(pending)}>
          Un paquete sin validar no admite itinerarios ni inscripciones. Revisa sus datos y valídalo o devuélvelo con
          observaciones.
        </Alert>
      )}

      <div className="packages__columns">
        <div className="packages__main">
          <PackagesTable
            packages={data}
            categories={categories.data}
            isAdmin={isAdmin}
            defaultSortKey={user.role === "manager" ? "status" : "name"}
            selectedId={selected?.id}
            onSelect={pkg => setSelection(pkg.id)}
          />
        </div>

        {isDrawerOpen && (
          <PackageDrawer
            // A fresh form for each package, and again once it is saved or validated
            key={`${selected?.id ?? "new"}-${selected?.status}`}
            pkg={selected ?? null}
            categories={categories.data}
            userId={user.id}
            isAdmin={isAdmin}
            isSaving={savePackage.isPending}
            isValidating={validatePackage.isPending}
            onSave={handleSave}
            onValidate={handleValidate}
            onClose={() => setSelection(null)}
          />
        )}
      </div>

      {toastElement}
    </>
  );
}

type PackagesTableProps = {
  packages: Package[];
  categories: Category[];
  isAdmin: boolean;
  defaultSortKey: string;
  selectedId?: number;
  onSelect: (pkg: Package) => void;
};

function PackagesTable({ packages, categories, isAdmin, defaultSortKey, selectedId, onSelect }: PackagesTableProps) {
  const [query, setQuery] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [status, setStatus] = useState("");

  const rows = packages.filter(
    pkg =>
      matchesSearch(pkg, query) &&
      (!categoryId || pkg.categories.some(category => String(category.id) === categoryId)) &&
      (!status || pkg.status === status),
  );

  function resetFilters() {
    setQuery("");
    setCategoryId("");
    setStatus("");
  }

  // The admin sees how many people hold permissions; the rest, their own permissions
  const accessColumn: Column<Package> = isAdmin
    ? {
        key: "people",
        label: "Personas",
        align: "right",
        render: pkg => pkg.people.length,
        sortValue: pkg => pkg.people.length,
        exportValue: pkg => pkg.people.length,
      }
    : {
        key: "my_permissions",
        label: "Tus permisos",
        sortable: false,
        render: pkg => (
          <span className="packages__badges">
            {permissionLabels(pkg.my_permissions).map(label => (
              <Badge key={label}>{label}</Badge>
            ))}
          </span>
        ),
        exportValue: pkg => permissionLabels(pkg.my_permissions).join(", "),
      };

  const columns: Column<Package>[] = [
    {
      key: "name",
      label: "Paquete",
      render: pkg => (
        <span className="packages__name">
          <span className="packages__name-title">{pkg.name}</span>
          <span className="packages__muted">{pkg.destination}</span>
        </span>
      ),
      exportValue: pkg => `${pkg.name} (${pkg.destination})`,
    },
    {
      key: "categories",
      label: "Categorías",
      sortable: false,
      render: pkg => (
        <span className="packages__badges">
          {pkg.categories.slice(0, SHOWN_CATEGORIES).map(category => (
            <Badge key={category.id} tone="category">
              {category.name}
            </Badge>
          ))}
          {pkg.categories.length > SHOWN_CATEGORIES && <Badge>+{pkg.categories.length - SHOWN_CATEGORIES}</Badge>}
        </span>
      ),
      exportValue: pkg => pkg.categories.map(category => category.name).join(", "),
    },
    accessColumn,
    {
      key: "approved_itineraries",
      label: "Itin. aprobados",
      align: "right",
      render: pkg => (
        <span className="packages__mono">
          {pkg.approved_itineraries} / {pkg.total_itineraries}
        </span>
      ),
      exportValue: pkg => `${pkg.approved_itineraries} / ${pkg.total_itineraries}`,
    },
    {
      key: "enrolled",
      label: "Inscritos",
      align: "right",
      render: pkg => <span className="packages__mono">{pkg.enrolled}</span>,
    },
    {
      key: "status",
      label: "Estado",
      render: pkg => <StatusPill status={STATUS_PILL[pkg.status].status}>{STATUS_PILL[pkg.status].label}</StatusPill>,
      sortValue: pkg => STATUS_ORDER[pkg.status],
      exportValue: pkg => STATUS_PILL[pkg.status].label,
    },
  ];

  return (
    <>
      <FilterBar summary={`${rows.length} paquetes`} onReset={resetFilters}>
        <Field
          id="packages-query"
          label="Buscar"
          placeholder="Nombre o destino"
          value={query}
          onChange={event => setQuery(event.target.value)}
        />
        <Field
          id="packages-category"
          label="Categoría"
          options={[
            { value: "", label: "Todas" },
            ...categories.map(category => ({ value: String(category.id), label: category.name })),
          ]}
          value={categoryId}
          onChange={event => setCategoryId(event.target.value)}
        />
        <Field
          id="packages-status"
          label="Estado"
          options={STATUS_OPTIONS}
          value={status}
          onChange={event => setStatus(event.target.value)}
        />
      </FilterBar>

      <DataTable
        title="Paquetes"
        subtitle={isAdmin ? "Todos" : "Con algún permiso tuyo"}
        columns={columns}
        rows={rows}
        defaultSort={{ key: defaultSortKey, dir: "asc" }}
        onRowClick={onSelect}
        selectedKey={selectedId}
        exportable
        footer="Pulsa una fila para ver el paquete."
        emptyText="No hay paquetes con estos filtros."
      />
    </>
  );
}

type PackageDrawerProps = {
  // Null while creating a new package
  pkg: Package | null;
  categories: Category[];
  userId: number;
  isAdmin: boolean;
  isSaving: boolean;
  isValidating: boolean;
  onSave: (form: PackageForm) => void;
  onValidate: (result: PackageValidationResult, observations: string) => void;
  onClose: () => void;
};

function PackageDrawer({
  pkg,
  categories,
  userId,
  isAdmin,
  isSaving,
  isValidating,
  onSave,
  onValidate,
  onClose,
}: PackageDrawerProps) {
  const initialCategories = pkg?.categories.map(category => category.id) ?? [];
  const [name, setName] = useState(pkg?.name ?? "");
  const [destination, setDestination] = useState(pkg?.destination ?? "");
  const [categoryIds, setCategoryIds] = useState(initialCategories);
  const [observations, setObservations] = useState("");
  const [showErrors, setShowErrors] = useState(false);
  const [observationsError, setObservationsError] = useState<string>();

  const isNew = pkg === null;
  const canEdit = isNew || pkg.can_edit;
  const canValidate = pkg?.can_validate ?? false;
  // RN-11
  const categoriesChanged = pkg?.status === "approved" && !sameCategories(categoryIds, initialCategories);
  const pill = STATUS_PILL[pkg?.status ?? "pending"];

  function save() {
    if (!name.trim() || !destination.trim()) {
      setShowErrors(true);
      return;
    }
    onSave({ name: name.trim(), destination: destination.trim(), category_ids: categoryIds });
  }

  function reject() {
    if (!observations.trim()) {
      setObservationsError("Escribe por qué lo devuelves.");
      return;
    }
    onValidate("rejected", observations.trim());
  }

  const footer = (
    <>
      <Button variant="ghost" onClick={onClose}>
        Cerrar
      </Button>
      {canValidate && (
        <>
          <Button variant="danger" disabled={isValidating} onClick={reject}>
            Devolver
          </Button>
          <Button
            variant="primary"
            icon="check"
            disabled={isValidating}
            onClick={() => onValidate("approved", observations.trim())}
          >
            Validar paquete
          </Button>
        </>
      )}
      {canEdit && (
        <Button variant="primary" disabled={isSaving} onClick={save}>
          {isNew ? "Crear paquete" : "Guardar paquete"}
        </Button>
      )}
    </>
  );

  return (
    <Drawer
      title={pkg?.name ?? "Nuevo paquete"}
      meta={
        pkg &&
        pkg.my_permissions.length > 0 && (
          <span className="packages__badges">
            {permissionLabels(pkg.my_permissions).map(label => (
              <Badge key={label}>{label}</Badge>
            ))}
          </span>
        )
      }
      footer={footer}
      onClose={onClose}
    >
      {!canEdit && <Alert tone="info">Solo lectura: no tienes permiso para editar este paquete.</Alert>}
      {isNew && (
        <Alert tone="info">
          El paquete quedará sin validar hasta que lo valide el jefe de operaciones. Mientras, no admite itinerarios ni
          inscripciones.
        </Alert>
      )}

      <Field
        id="package-name"
        label="Nombre"
        required
        value={name}
        disabled={!canEdit}
        error={showErrors && !name.trim() ? "Escribe el nombre del paquete." : undefined}
        onChange={event => setName(event.target.value)}
      />
      <Field
        id="package-destination"
        label="Destino"
        required
        value={destination}
        disabled={!canEdit}
        error={showErrors && !destination.trim() ? "Escribe el destino del paquete." : undefined}
        onChange={event => setDestination(event.target.value)}
      />

      <div className="packages__group">
        <span className="packages__group-label">Categorías a cubrir</span>
        {canEdit ? (
          <ChipSelect
            label="Categorías a cubrir"
            options={categories.map(category => ({ value: String(category.id), label: category.name }))}
            value={categoryIds.map(String)}
            onChange={value => setCategoryIds(value.map(Number))}
          />
        ) : (
          <span className="packages__badges">
            {pkg?.categories.map(category => (
              <Badge key={category.id} tone="category">
                {category.name}
              </Badge>
            ))}
          </span>
        )}
        <span className="packages__muted">
          {categoriesChanged
            ? "Has cambiado las categorías: al guardar, el paquete vuelve a quedar pendiente de validar."
            : "Todo itinerario del paquete debe incluir al menos una actividad de cada una."}
        </span>
      </div>

      <div className="packages__validation">
        <div className="packages__validation-head">
          <span className="packages__eyebrow">Validación del paquete</span>
          <StatusPill status={pill.status}>{pill.label}</StatusPill>
        </div>
        <span className="packages__muted">{pkg ? validationText(pkg) : "Se creará sin validar."}</span>
      </div>

      {pkg && canValidate && (
        <div className="packages__group">
          <span className="packages__eyebrow">Antes de validar</span>
          <ul className="packages__checks">
            {validationChecks(pkg).map(check => (
              <li key={check.text} className="packages__check">
                <span className={check.ok ? "packages__check-icon" : "packages__check-icon packages__check-icon--warn"}>
                  <Icon name={check.ok ? "check" : "alert"} size={16} />
                </span>
                {check.text}
              </li>
            ))}
          </ul>
          <Field
            id="package-observations"
            label="Observaciones"
            multiline
            placeholder="Obligatorias si lo devuelves"
            value={observations}
            error={observationsError}
            onChange={event => {
              setObservations(event.target.value);
              setObservationsError(undefined);
            }}
          />
        </div>
      )}

      {pkg && (
        <div className="packages__group">
          <span className="packages__eyebrow">Personas con permisos</span>
          {pkg.people.length === 0 && <span className="packages__muted">Nadie tiene permisos en este paquete.</span>}
          <ul className="packages__people">
            {pkg.people.map(person => (
              <li key={person.user_id} className="packages__person">
                <span className="packages__person-name">
                  {person.name}
                  {person.user_id === userId && " (tú)"}
                </span>
                <span className="packages__badges packages__badges--end">
                  {permissionLabels(person.permissions).map(label => (
                    <Badge key={label}>{label}</Badge>
                  ))}
                </span>
              </li>
            ))}
          </ul>
          {isAdmin && (
            <Link to="/personas" className="packages__link">
              Cambiar permisos en Guías y permisos
            </Link>
          )}
        </div>
      )}
    </Drawer>
  );
}
