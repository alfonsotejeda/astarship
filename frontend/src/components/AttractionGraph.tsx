/**
 * Fondo decorativo: la red de atracciones del problema.
 *
 * Dibuja los nodos (atracciones) con sus conexiones de transporte en gris y
 * resalta encima un itinerario concreto que se va trazando en bucle, que es
 * justo lo que el sistema genera de forma automatica.
 *
 * Es puramente decorativo: queda oculto para lectores de pantalla.
 */

type Nodo = { id: string; x: number; y: number };

/** Atracciones colocadas a mano para que la composicion quede equilibrada. */
const NODOS: Nodo[] = [
  { id: "a", x: 90, y: 330 },
  { id: "b", x: 230, y: 160 },
  { id: "c", x: 300, y: 430 },
  { id: "d", x: 450, y: 250 },
  { id: "e", x: 560, y: 470 },
  { id: "f", x: 690, y: 150 },
  { id: "g", x: 780, y: 360 },
  { id: "h", x: 930, y: 230 },
  { id: "i", x: 1010, y: 460 },
  { id: "j", x: 1130, y: 300 },
];

/** Conexiones de transporte disponibles entre atracciones. */
const ARISTAS: [string, string][] = [
  ["a", "b"],
  ["a", "c"],
  ["b", "d"],
  ["c", "d"],
  ["c", "e"],
  ["d", "e"],
  ["d", "f"],
  ["e", "g"],
  ["f", "g"],
  ["f", "h"],
  ["g", "i"],
  ["h", "i"],
  ["h", "j"],
  ["i", "j"],
];

/** Itinerario que se resalta sobre la red. */
const RUTA = ["a", "b", "d", "f", "g", "i", "j"];

const punto = (id: string) => NODOS.find((n) => n.id === id)!;

export function AttractionGraph() {
  const trazado = RUTA.map(punto)
    .map((n, i) => `${i === 0 ? "M" : "L"} ${n.x} ${n.y}`)
    .join(" ");

  const enRuta = new Set(RUTA);

  return (
    <svg
      className="graph"
      viewBox="0 0 1220 600"
      preserveAspectRatio="xMidYMid slice"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="ruta" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#ff9d5c" />
          <stop offset="55%" stopColor="#ff5c8a" />
          <stop offset="100%" stopColor="#a86bff" />
        </linearGradient>
      </defs>

      {ARISTAS.map(([desde, hasta]) => {
        const a = punto(desde);
        const b = punto(hasta);
        return (
          <line
            key={`${desde}${hasta}`}
            x1={a.x}
            y1={a.y}
            x2={b.x}
            y2={b.y}
            className="graph__edge"
          />
        );
      })}

      <path d={trazado} className="graph__route" />

      {NODOS.map((n, i) => (
        <circle
          key={n.id}
          cx={n.x}
          cy={n.y}
          r={enRuta.has(n.id) ? 7 : 4.5}
          className={enRuta.has(n.id) ? "graph__node graph__node--on" : "graph__node"}
          style={{ animationDelay: `${i * 0.35}s` }}
        />
      ))}
    </svg>
  );
}
