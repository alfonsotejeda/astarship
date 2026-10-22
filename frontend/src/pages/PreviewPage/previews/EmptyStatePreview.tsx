import { Button } from "@/components/Button/Button";
import { EmptyState } from "@/components/EmptyState/EmptyState";
import { Panel } from "@/components/Panel/Panel";

export function EmptyStatePreview() {
  return (
    <>
      <section className="preview-section">
        <h2>Todavía no hay nada</h2>
        <Panel>
          <EmptyState
            icon="layers"
            title="Aún no hay actividades en el banco"
            action={
              <Button variant="primary" icon="plus">
                Añadir actividad
              </Button>
            }
          >
            Crea la primera actividad para poder generar itinerarios de este paquete.
          </EmptyState>
        </Panel>
      </section>

      <section className="preview-section">
        <h2>Los filtros no devuelven nada</h2>
        <Panel>
          <EmptyState title="Ningún itinerario coincide con los filtros" action={<Button>Limpiar filtros</Button>}>
            Prueba con otro paquete o quita la búsqueda.
          </EmptyState>
        </Panel>
      </section>

      <section className="preview-section">
        <h2>Cola vacía</h2>
        <Panel>
          <EmptyState icon="check-circle" title="No tienes itinerarios por revisar" action={<Button>Ver validados</Button>}>
            Cuando un guía envíe un itinerario a revisión aparecerá aquí.
          </EmptyState>
        </Panel>
      </section>
    </>
  );
}
