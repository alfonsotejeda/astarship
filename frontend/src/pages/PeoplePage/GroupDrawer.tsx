import { useState } from "react";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { Drawer } from "@/components/Drawer/Drawer";
import { Field } from "@/components/Field/Field";
import type { Package } from "@/lib/api/packages";
import type { GroupForm, Guide } from "@/lib/api/people";

type GroupDrawerProps = {
  guides: Guide[];
  // Only validated packages
  packages: Package[];
  isSaving: boolean;
  onSave: (form: GroupForm) => void;
  onClose: () => void;
};

export function GroupDrawer({ guides, packages, isSaving, onSave, onClose }: GroupDrawerProps) {
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
