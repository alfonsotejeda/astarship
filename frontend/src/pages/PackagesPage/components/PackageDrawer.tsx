import { useId, useState } from "react";
import { Link } from "react-router";
import { Alert } from "@/components/Alert/Alert";
import { Badge } from "@/components/Badge/Badge";
import { Button } from "@/components/Button/Button";
import { ChipSelect } from "@/components/ChipSelect/ChipSelect";
import { Field } from "@/components/Field/Field";
import { Icon } from "@/components/Icon/Icon";
import { StatusPill } from "@/components/StatusPill/StatusPill";
import type { Category } from "@/lib/api/catalogs";
import type { Package, PackageForm, PackageValidationResult } from "@/lib/api/packages";
import { permissionLabels, STATUS_PILL, validationChecks, validationText } from "../lib/package";

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

function sameCategories(a: number[], b: number[]) {
  return [...a].sort().join() === [...b].sort().join();
}

export function PackageDrawer({
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
  const titleId = useId();
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
  const title = pkg?.name ?? "Nuevo paquete";
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

  return (
    <aside className="packages__drawer" aria-labelledby={titleId}>
      <div className="packages__drawer-header">
        <div className="packages__drawer-heading">
          <h2 id={titleId} className="packages__drawer-title">
            {title}
          </h2>
          {pkg && pkg.my_permissions.length > 0 && (
            <span className="packages__badges">
              {permissionLabels(pkg.my_permissions).map(label => (
                <Badge key={label}>{label}</Badge>
              ))}
            </span>
          )}
        </div>
        <Button variant="ghost" size="sm" icon="x" aria-label="Cerrar" onClick={onClose} />
      </div>

      <div className="packages__drawer-body">
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
      </div>

      <div className="packages__drawer-footer">
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
      </div>
    </aside>
  );
}
