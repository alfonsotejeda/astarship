import { useState } from "react";
import { Button } from "@/components/Button/Button";
import { ChipSelect } from "@/components/ChipSelect/ChipSelect";
import { Drawer } from "@/components/Drawer/Drawer";
import { Field } from "@/components/Field/Field";
import type { Package } from "@/lib/api/packages";
import type { GroupTourist, TouristForm, TravelGroup } from "@/lib/api/people";
import { formatDateRange, formatItineraryCode } from "@/lib/format";
import { emailError, passwordError } from "@/lib/people";
import { byName } from "./shared";

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

export function TouristDrawer({ tourist, groupId, groups, packages, isSaving, onSave, onClose }: TouristDrawerProps) {
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
