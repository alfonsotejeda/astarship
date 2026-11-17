import { useState } from "react";
import { AttractionFields } from "@/components/AttractionFields/AttractionFields";
import { Button } from "@/components/Button/Button";
import { Drawer } from "@/components/Drawer/Drawer";
import type { Attraction, AttractionForm } from "@/lib/api/attractions";
import { attractionPoint, EMPTY_DRAFT, toDraft, toForm } from "@/lib/attraction";

type AttractionDrawerProps = {
  // Null while registering a new one
  attraction: Attraction | null;
  attractions: Attraction[];
  isSaving: boolean;
  onSave: (form: AttractionForm) => void;
  onClose: () => void;
};

export function AttractionDrawer({ attraction, attractions, isSaving, onSave, onClose }: AttractionDrawerProps) {
  const [draft, setDraft] = useState(attraction ? toDraft(attraction) : EMPTY_DRAFT);
  const [showErrors, setShowErrors] = useState(false);

  // The others, for reference; clicking them would leave the form
  const nearby = attractions
    .filter(item => item.id !== attraction?.id)
    .map(item => ({ ...attractionPoint(item), to: undefined }));

  function save() {
    const form = toForm(draft);
    if (!form) {
      setShowErrors(true);
      return;
    }
    onSave(form);
  }

  return (
    <Drawer
      title={attraction?.name ?? "Nueva atracción"}
      onClose={onClose}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="primary" disabled={isSaving} onClick={save}>
            {attraction ? "Guardar atracción" : "Registrar atracción"}
          </Button>
        </>
      }
    >
      <AttractionFields
        idPrefix="attraction"
        value={draft}
        onChange={setDraft}
        showErrors={showErrors}
        nearby={nearby}
      />
    </Drawer>
  );
}
