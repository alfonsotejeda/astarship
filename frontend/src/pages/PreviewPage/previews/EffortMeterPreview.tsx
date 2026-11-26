import { EffortMeter } from "@/components/EffortMeter/EffortMeter";

export function EffortMeterPreview() {
  return (
    <>
      <section className="preview-section">
        <h2>Con palabra</h2>
        <div className="preview-row">
          <EffortMeter level="low" />
          <EffortMeter level="medium" />
          <EffortMeter level="high" />
        </div>
      </section>

      <section className="preview-section">
        <h2>Sin palabra (celdas estrechas)</h2>
        <div className="preview-row">
          <EffortMeter level="low" showLabel={false} />
          <EffortMeter level="medium" showLabel={false} />
          <EffortMeter level="high" showLabel={false} />
        </div>
      </section>

      <section className="preview-section">
        <h2>Enfocable</h2>
        <div className="preview-row">
          <EffortMeter level="medium" tabIndex={0} />
          <EffortMeter level="high" showLabel={false} tabIndex={0} />
        </div>
      </section>
    </>
  );
}
