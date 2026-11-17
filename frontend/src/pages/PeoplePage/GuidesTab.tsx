import { useState } from "react";
import { Link } from "react-router";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { Checkbox } from "@/components/Checkbox/Checkbox";
import { Drawer } from "@/components/Drawer/Drawer";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Field } from "@/components/Field/Field";
import { Panel } from "@/components/Panel/Panel";
import { LoadError, LoadingPanel } from "@/components/QueryStatus/QueryStatus";
import type { Package } from "@/lib/api/packages";
import type { Authorization, Guide, GuideForm } from "@/lib/api/people";
import { exportPdf } from "@/lib/pdf";
import { authorizationKey, changesText, emailError, passwordError, savedPermissions } from "@/lib/people";
import type { PermissionDraft, Permissions } from "@/lib/people";
import { byName } from "./shared";
import type { QueryState } from "./shared";

const PERMISSION_KINDS: { key: keyof Permissions; label: string; verb: string }[] = [
  { key: "can_generate", label: "Genera", verb: "genera itinerarios en" },
  { key: "can_validate", label: "Valida", verb: "valida itinerarios en" },
];

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

export function GuidesTab({
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
              <Link to="/packages" className="people__link">
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

type GuideDrawerProps = {
  isSaving: boolean;
  onSave: (form: GuideForm) => void;
  onClose: () => void;
};

export function GuideDrawer({ isSaving, onSave, onClose }: GuideDrawerProps) {
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
