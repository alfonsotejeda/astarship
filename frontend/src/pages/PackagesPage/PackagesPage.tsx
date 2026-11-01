import { useState } from "react";
import { Navigate } from "react-router";
import { useAuth } from "@/app/providers/auth/AuthContext";
import { HOME_BY_ROLE } from "@/app/providers/auth/roles";
import type { Role } from "@/app/providers/auth/roles";
import { Alert } from "@/components/Alert/Alert";
import type { Tone } from "@/components/Alert/tones";
import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import { Toast } from "@/components/Toast/Toast";
import { useCategories } from "@/lib/api/catalogs";
import { usePackages, useSavePackage, useValidatePackage } from "@/lib/api/packages";
import type { Package, PackageForm, PackageValidationResult } from "@/lib/api/packages";
import { PackageDrawer } from "./components/PackageDrawer";
import { PackagesTable } from "./components/PackagesTable";
import "./PackagesPage.css";

type ToastMessage = { tone: Tone; text: string };

// A package id, "new" while creating one, or null with the drawer closed
type Selection = number | "new" | null;

const SUBTITLES: Partial<Record<Role, string>> = {
  admin: "Destino, categorías a cubrir, personas con permisos y estado de validación.",
  guide: "Los paquetes en los que tienes algún permiso. Solo el administrador puede editarlos.",
  manager: "Los paquetes que puedes validar. Un paquete validado admite itinerarios e inscripciones.",
};

// The manager starts on the first package to validate; the rest, on the first one by name
function defaultSelection(packages: Package[], role: Role): Selection {
  if (role === "manager") return packages.find(pkg => pkg.can_validate)?.id ?? null;
  return [...packages].sort((a, b) => a.name.localeCompare(b.name))[0]?.id ?? null;
}

function pendingTitle(count: number) {
  return count === 1 ? "1 paquete pendiente de validar" : `${count} paquetes pendientes de validar`;
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
