import { CriteriaCheck } from "@/components/CriteriaCheck/CriteriaCheck";
import type { Criterion } from "@/components/CriteriaCheck/CriteriaCheck";
import { Panel } from "@/components/Panel/Panel";

const SOME_FAIL: Criterion[] = [
  { label: "Proporción por tipo", target: "40 / 35 / 25 %", actual: "43 / 36 / 21 %", ok: true, detail: "Tolerancia ±10 puntos" },
  { label: "Cobertura de categorías", target: "5 de 5", actual: "4 de 5", ok: false, detail: "Falta Música" },
  { label: "Total de actividades", target: "14", actual: "14", ok: true },
  { label: "Esfuerzo alto al final del día", target: "≤ 1 por día", actual: "1 por día", ok: true },
];

const ALL_MET: Criterion[] = SOME_FAIL.map(item => ({ ...item, actual: item.target, ok: true, detail: undefined }));

export function CriteriaCheckPreview() {
  return (
    <>
      <section className="preview-section" style={{ maxWidth: 620 }}>
        <h2>Con criterios sin cumplir</h2>
        <Panel>
          <CriteriaCheck items={SOME_FAIL} />
        </Panel>
      </section>

      <section className="preview-section" style={{ maxWidth: 620 }}>
        <h2>Todos cumplidos</h2>
        <Panel>
          <CriteriaCheck title="Resultado del generador" items={ALL_MET} />
        </Panel>
      </section>
    </>
  );
}
