import { AttractionMap } from "@/components/AttractionMap/AttractionMap";
import type { MapPoint } from "@/components/AttractionMap/AttractionMap";
import { Field } from "@/components/Field/Field";
import { draftErrors, draftPosition } from "@/lib/attraction";
import type { AttractionDraft } from "@/lib/attraction";
import "./AttractionFields.css";

type AttractionFieldsProps = {
  idPrefix: string;
  value: AttractionDraft;
  onChange: (value: AttractionDraft) => void;
  showErrors: boolean;
  disabled?: boolean;
  // The other attractions, for reference while picking
  nearby?: MapPoint[];
};

// Shared by the attraction drawer and the new attraction dialog of the activity form
export function AttractionFields({
  idPrefix,
  value,
  onChange,
  showErrors,
  disabled = false,
  nearby = [],
}: AttractionFieldsProps) {
  const errors: Partial<ReturnType<typeof draftErrors>> = showErrors
    ? draftErrors(value)
    : {};
  const position = draftPosition(value);

  function pick({ lat, lng }: { lat: number; lng: number }) {
    onChange({ ...value, latitude: lat.toFixed(5), longitude: lng.toFixed(5) });
  }

  return (
    <div className="attraction-fields">
      <Field
        id={`${idPrefix}-name`}
        label="Nombre"
        required
        value={value.name}
        disabled={disabled}
        error={errors.name}
        onChange={(event) => onChange({ ...value, name: event.target.value })}
      />
      <Field
        id={`${idPrefix}-address`}
        label="Dirección"
        required
        placeholder="Calle Obispo 117, La Habana Vieja"
        value={value.address}
        disabled={disabled}
        error={errors.address}
        onChange={(event) =>
          onChange({ ...value, address: event.target.value })
        }
      />

      <div className="attraction-fields__location">
        <span className="attraction-fields__label">Ubicación</span>
        <AttractionMap
          points={nearby}
          picked={position}
          onPick={disabled ? undefined : pick}
          label="Mapa para marcar la ubicación"
          height={240}
        />
        {!disabled && (
          <span className="attraction-fields__hint">
            Pulsa en el mapa para marcarla.
          </span>
        )}
        <div className="attraction-fields__coords">
          <Field
            id={`${idPrefix}-latitude`}
            label="Latitud"
            inputMode="decimal"
            value={value.latitude}
            disabled={disabled}
            error={errors.location}
            onChange={(event) =>
              onChange({ ...value, latitude: event.target.value })
            }
          />
          <Field
            id={`${idPrefix}-longitude`}
            label="Longitud"
            inputMode="decimal"
            value={value.longitude}
            disabled={disabled}
            onChange={(event) =>
              onChange({ ...value, longitude: event.target.value })
            }
          />
        </div>
      </div>
    </div>
  );
}
