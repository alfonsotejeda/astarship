/**
 * Indicador del estado de la API.
 *
 * Consulta `/api/health` al montar y muestra si el backend responde. Sirve para
 * comprobar de un vistazo que el `docker compose` y el proxy de Vite estan bien
 * configurados, sin abrir la consola.
 */

import { useEffect, useState } from "react";

type Estado = "consultando" | "en-linea" | "sin-conexion";

const ETIQUETAS: Record<Estado, string> = {
  consultando: "Consultando la API…",
  "en-linea": "API en línea",
  "sin-conexion": "API sin conexión",
};

export function ApiStatus() {
  const [estado, setEstado] = useState<Estado>("consultando");

  useEffect(() => {
    const control = new AbortController();

    fetch("/api/health", { signal: control.signal })
      .then((r) => (r.ok ? setEstado("en-linea") : setEstado("sin-conexion")))
      .catch(() => {
        if (!control.signal.aborted) setEstado("sin-conexion");
      });

    return () => control.abort();
  }, []);

  return (
    <p className={`pill pill--${estado}`} role="status">
      <span className="pill__dot" aria-hidden="true" />
      {ETIQUETAS[estado]}
      {estado === "sin-conexion" && (
        <code className="pill__hint">docker compose up -d</code>
      )}
    </p>
  );
}
