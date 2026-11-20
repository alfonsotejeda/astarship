import { useState } from "react";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { Dialog } from "@/components/Dialog/Dialog";
import { Field } from "@/components/Field/Field";
import { useBookPackage } from "@/lib/api/bookings";
import type { CatalogPackageDetail } from "@/lib/api/catalog";
import { formatItineraryCode } from "@/lib/format";

const NO_PREFERENCE = "";

function today() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 10);
}

type BookingDialogProps = {
  pkg: CatalogPackageDetail;
  // The itinerary the tourist was looking at, offered as the preference
  initialItineraryId: number | null;
  onBooked: () => void;
  onClose: () => void;
};

// No payment: picking the package is the whole purchase. The admin then assigns an itinerary
export function BookingDialog({ pkg, initialItineraryId, onBooked, onClose }: BookingDialogProps) {
  const book = useBookPackage();
  const [startDate, setStartDate] = useState("");
  const [preferred, setPreferred] = useState(initialItineraryId !== null ? String(initialItineraryId) : NO_PREFERENCE);
  const [error, setError] = useState<string>();
  const min = today();

  function submit() {
    if (!startDate || startDate < min) {
      setError("Elige una fecha a partir de hoy.");
      return;
    }
    book.mutate(
      {
        packageId: pkg.id,
        requested_start_date: startDate,
        preferred_itinerary_id: preferred === NO_PREFERENCE ? null : Number(preferred),
      },
      { onSuccess: onBooked },
    );
  }

  return (
    <Dialog
      open
      title={`Elegir «${pkg.name}»`}
      onClose={onClose}
      actions={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={book.isPending} onClick={submit}>
            {book.isPending ? "Enviando…" : "Seleccionar paquete"}
          </Button>
        </>
      }
    >
      <p className="catalog__text">
        La agencia te asignará uno de sus itinerarios. Hasta entonces lo verás en Mis itinerarios como pendiente y podrás
        cancelarlo.
      </p>

      {book.isError && (
        <Alert tone="bad" title="No se pudo pedir el paquete">
          {book.error.message}
        </Alert>
      )}

      <Field
        id="booking-start"
        label="¿Cuándo quieres empezar?"
        type="date"
        required
        min={min}
        value={startDate}
        error={error}
        hint="Es una propuesta: la agencia la confirma al asignarte el itinerario."
        onChange={event => {
          setStartDate(event.target.value);
          setError(undefined);
        }}
      />
      <Field
        id="booking-itinerary"
        label="Itinerario preferido"
        options={[
          { value: NO_PREFERENCE, label: "Sin preferencia" },
          ...pkg.itineraries.map(item => ({
            value: String(item.id),
            label: `${formatItineraryCode(item.id)} · ${item.days.length === 1 ? "1 día" : `${item.days.length} días`} · guía ${item.guide_name}`,
          })),
        ]}
        value={preferred}
        hint="Opcional. Es una sugerencia; decide la agencia."
        onChange={event => setPreferred(event.target.value)}
      />
    </Dialog>
  );
}
