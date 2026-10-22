import { useState } from "react";
import type { ReactNode } from "react";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { Field } from "@/components/Field/Field";
import { Panel } from "@/components/Panel/Panel";
import { Tabs } from "@/components/Tabs/Tabs";
import "./ReviewPanel.css";

export type ReviewDecision = "aprobar" | "rechazar" | "rehacer";

export type ReviewResult = {
  decision: ReviewDecision;
  observations: string;
};

type ReviewPanelProps = {
  decision?: ReviewDecision;
  defaultDecision?: ReviewDecision;
  onDecisionChange?: (decision: ReviewDecision) => void;
  defaultObservations?: string;
  onSubmit?: (result: ReviewResult) => void;
  id?: string;
  className?: string;
  children?: ReactNode;
};

const DECISIONS: { key: ReviewDecision; label: string; submitLabel: string }[] = [
  { key: "aprobar", label: "Aprobar", submitLabel: "Aprobar itinerario" },
  { key: "rechazar", label: "Rechazar", submitLabel: "Rechazar itinerario" },
  { key: "rehacer", label: "Pedir otro", submitLabel: "Pedir otro itinerario" },
];

export function ReviewPanel({
  decision,
  defaultDecision = "aprobar",
  onDecisionChange,
  defaultObservations = "",
  onSubmit,
  id = "review",
  className,
  children,
}: ReviewPanelProps) {
  const [uncontrolledDecision, setUncontrolledDecision] = useState(defaultDecision);
  const [observations, setObservations] = useState(defaultObservations);

  const isControlled = decision !== undefined;
  const current = isControlled ? decision : uncontrolledDecision;
  const { submitLabel } = DECISIONS.find(item => item.key === current) ?? DECISIONS[0];
  // Rejecting or asking for another one must say why
  const needsObservations = current !== "aprobar";
  const canSubmit = !needsObservations || observations.trim() !== "";

  function changeDecision(key: string) {
    const next = key as ReviewDecision;
    if (!isControlled) setUncontrolledDecision(next);
    onDecisionChange?.(next);
  }

  const footer = (
    <Button
      variant={current === "aprobar" ? "primary" : "danger"}
      block
      disabled={!canSubmit}
      onClick={() => onSubmit?.({ decision: current, observations: observations.trim() })}
    >
      {submitLabel}
    </Button>
  );

  return (
    <Panel
      title="Tu decisión"
      subtitle="Queda registrada con fecha y tus observaciones."
      footer={footer}
      className={["review-panel", className].filter(Boolean).join(" ")}
    >
      <Tabs
        variant="segmented"
        label="Decisión"
        items={DECISIONS.map(item => ({ key: item.key, label: item.label }))}
        value={current}
        onChange={changeDecision}
      />

      {current === "rehacer" && (
        <Alert tone="warn">El guía recibirá tus criterios para confeccionar otro itinerario de este paquete.</Alert>
      )}

      <Field
        id={`${id}-observations`}
        label="Observaciones"
        multiline
        required={needsObservations}
        value={observations}
        onChange={event => setObservations(event.target.value)}
        placeholder={
          current === "rehacer"
            ? "Qué criterios debe cumplir el nuevo itinerario"
            : "Lo que el guía debe saber de esta revisión"
        }
        hint={needsObservations ? "Obligatorias al rechazar o pedir otro." : "Opcionales al aprobar."}
      />

      {children}
    </Panel>
  );
}
