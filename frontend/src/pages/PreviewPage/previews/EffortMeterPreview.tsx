import { EffortMeter } from "@/components/EffortMeter/EffortMeter";

export function EffortMeterPreview() {
  return (
    <>
      <section className="preview-section">
        <h2>Con palabra</h2>
        <div className="preview-row">
          <EffortMeter level="bajo" />
          <EffortMeter level="medio" />
          <EffortMeter level="alto" />
        </div>
      </section>

      <section className="preview-section">
        <h2>Sin palabra (celdas estrechas)</h2>
        <div className="preview-row">
          <EffortMeter level="bajo" showLabel={false} />
          <EffortMeter level="medio" showLabel={false} />
          <EffortMeter level="alto" showLabel={false} />
        </div>
      </section>

      <section className="preview-section">
        <h2>Enfocable</h2>
        <div className="preview-row">
          <EffortMeter level="medio" tabIndex={0} />
          <EffortMeter level="alto" showLabel={false} tabIndex={0} />
        </div>
      </section>
    </>
  );
}
