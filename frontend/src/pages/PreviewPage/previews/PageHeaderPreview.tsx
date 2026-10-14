import { Button } from "@/components/Button/Button";
import { PageHeader } from "@/components/PageHeader/PageHeader";
import { StatusPill } from "@/components/StatusPill/StatusPill";

export function PageHeaderPreview() {
  return (
    <>
      <section className="preview-section">
        <h2>Detalle de itinerario</h2>
        <PageHeader
          title="IT-0151 · La Habana colonial"
          status={<StatusPill status="revision" />}
          subtitle="Generado por Laura Pérez · 10 oct 2026 · 5 días · 14 actividades"
          breadcrumbs={[{ label: "Por revisar", to: "/preview/PageHeader" }, { label: "IT-0151" }]}
          actions={<Button icon="download">Exportar PDF</Button>}
        />
      </section>

      <section className="preview-section">
        <h2>Listado</h2>
        <PageHeader
          title="Banco de actividades"
          subtitle="128 actividades · 3 tipos"
          actions={
            <Button variant="primary" icon="plus">
              Nueva actividad
            </Button>
          }
        />
      </section>

      <section className="preview-section">
        <h2>Solo título</h2>
        <PageHeader title="Reportes" />
      </section>
    </>
  );
}
