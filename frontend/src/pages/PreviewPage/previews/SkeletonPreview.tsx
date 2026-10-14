import { Panel } from "@/components/Panel/Panel";
import { Skeleton } from "@/components/Skeleton/Skeleton";

export function SkeletonPreview() {
  return (
    <>
      <section className="preview-section">
        <h2>Recorrido (stops)</h2>
        <div style={{ maxWidth: 420 }}>
          <Skeleton variant="stops" count={4} />
        </div>
      </section>

      <section className="preview-section">
        <h2>Bloques</h2>
        <div style={{ maxWidth: 520 }}>
          <Panel>
            <div style={{ display: "grid", gap: "var(--space-2)" }} role="status" aria-busy="true" aria-label="Cargando actividad">
              <Skeleton width="60%" height={22} />
              <Skeleton width="35%" />
              <Skeleton height={64} />
            </div>
          </Panel>
        </div>
      </section>
    </>
  );
}
