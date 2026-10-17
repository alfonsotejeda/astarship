import { useState } from "react";
import { Button } from "@/components/Button/Button";
import { ProportionInput } from "@/components/ProportionInput/ProportionInput";
import type { Proportion } from "@/components/ProportionInput/ProportionInput";

export function ProportionInputPreview() {
  const [proportion, setProportion] = useState<Proportion>({ visita: 40, excursion: 35, taller: 25 });
  const isValid = proportion.visita + proportion.excursion + proportion.taller === 100;

  return (
    <>
      <section className="preview-section" style={{ maxWidth: 520 }}>
        <h2>Con total (controlado)</h2>
        <ProportionInput id="preview-proportion" total={14} value={proportion} onChange={setProportion} />
        <div className="preview-row">
          <Button variant="primary" icon="sparkles" disabled={!isValid}>
            Generar itinerario
          </Button>
        </div>
      </section>

      <section className="preview-section" style={{ maxWidth: 520 }}>
        <h2>Sin total (libre, suma incorrecta)</h2>
        <ProportionInput id="preview-proportion-free" defaultValue={{ visita: 50, excursion: 30, taller: 30 }} />
      </section>
    </>
  );
}
