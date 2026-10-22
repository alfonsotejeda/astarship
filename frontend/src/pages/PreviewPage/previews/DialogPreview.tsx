import { useState } from "react";
import { Alert } from "@/components/Alert/Alert";
import { Button } from "@/components/Button/Button";
import { Dialog } from "@/components/Dialog/Dialog";
import { Field } from "@/components/Field/Field";

export function DialogPreview() {
  const [assignOpen, setAssignOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const [result, setResult] = useState("");

  function assign() {
    setAssignOpen(false);
    setResult("Asignado a 12 turistas");
  }

  function sendRequest() {
    setRequestOpen(false);
    setResult("Solicitud enviada");
  }

  return (
    <>
      <section className="preview-section">
        <h2>Confirmación</h2>
        <div className="preview-row">
          <Button onClick={() => setAssignOpen(true)}>Asignar al grupo</Button>
          <Button onClick={() => setRequestOpen(true)}>Pedir modificación</Button>
          {result && <span>{result}</span>}
        </div>
      </section>

      <Dialog
        open={assignOpen}
        title="¿Asignar a todo el grupo?"
        onClose={() => setAssignOpen(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setAssignOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={assign}>
              Asignar a 12 turistas
            </Button>
          </>
        }
      >
        <p style={{ margin: 0 }}>IT-0142 se asignará a los 12 turistas del grupo Habana Octubre A.</p>
        <Alert tone="warn">2 turistas ya tienen un itinerario de este paquete y se omitirán.</Alert>
      </Dialog>

      <Dialog
        open={requestOpen}
        title="Pedir modificación"
        size="lg"
        onClose={() => setRequestOpen(false)}
        actions={
          <>
            <Button variant="ghost" onClick={() => setRequestOpen(false)}>
              Cancelar
            </Button>
            <Button variant="primary" onClick={sendRequest}>
              Enviar solicitud
            </Button>
          </>
        }
      >
        <Field
          id="dialog-request"
          label="Describe el cambio que necesitas"
          multiline
          placeholder="Qué actividad quieres cambiar y por qué"
        />
      </Dialog>
    </>
  );
}
