import { useState } from "react";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";

export function AlertPreview() {
  const [showInfo, setShowInfo] = useState(true);

  return (
    <>
      <section className="preview-section">
        <h2>Tonos</h2>
        <Alert tone="warn" title="Posible duplicado" action={<Button size="sm">Ver la existente</Button>}>
          Ya existe «Recorrido por la Plaza Vieja» en la misma atracción, creada por Ernesto Díaz.
        </Alert>
        <Alert tone="bad" title="Asignación doble">
          Ana Gómez ya tiene asignado IT-0142 en La Habana colonial. Quita esa asignación o elige otro paquete.
        </Alert>
        <Alert tone="ok" title="Itinerario aprobado">
          IT-0151 ya puede asignarse a un grupo.
        </Alert>
      </section>

      <section className="preview-section">
        <h2>Descartable</h2>
        {showInfo ? (
          <Alert tone="info" onDismiss={() => setShowInfo(false)}>
            Estás viendo itinerarios de otros guías de este paquete. Solo puedes editar los tuyos.
          </Alert>
        ) : (
          <div className="preview-row">
            <Button size="sm" onClick={() => setShowInfo(true)}>
              Mostrar de nuevo
            </Button>
          </div>
        )}
      </section>
    </>
  );
}
