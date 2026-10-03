/**
 * Portada de Astarship.
 *
 * Pantalla de arranque del proyecto: presenta el sistema, deja a la vista el
 * estado de la API y sirve de punto de partida para las vistas reales
 * (actividades, itinerarios, paquetes y reportes).
 */

import { ApiStatus } from "./components/ApiStatus";
import { AttractionGraph } from "./components/AttractionGraph";
import "./App.css";

const STACK = [
  { nombre: "FastAPI", papel: "API y documentación automática", color: "var(--accent-3)" },
  { nombre: "PostgreSQL 18", papel: "Esquema relacional y consultas", color: "var(--accent-2)" },
  { nombre: "React + TypeScript", papel: "Interfaz multiplataforma", color: "var(--accent)" },
  { nombre: "Docker", papel: "Mismo entorno para todo el equipo", color: "#a86bff" },
];

const EQUIPO = [
  { nombre: "Adrián Estévez Álvarez", grupo: "C312", github: "Chikiak" },
  { nombre: "Alfonso Tejeda Rodríguez", grupo: "C312", github: "alfonsotejeda" },
  { nombre: "Eric Reyes Milián", grupo: "C312", github: "EricReyesMilian" },
  { nombre: "Kamila Reinoso Asín", grupo: "C311", github: "KamAlien" },
  { nombre: "Miguel A. Cazorla Zamora", grupo: "C312", github: "andr-migue" },
];

function App() {
  return (
    <div className="app">
      <div className="app__backdrop">
        <AttractionGraph />
      </div>

      <header className="topbar">
        <span className="brand">
          <span className="brand__mark" aria-hidden="true" />
          Astarship
        </span>
        <span className="topbar__team">HAVING&nbsp;Fe</span>
      </header>

      <main className="hero">
        <p className="eyebrow">Bases de Datos II · Ingeniería de Software · 2026–2027</p>

        <h1 className="hero__title">
          Itinerarios que se <span className="grad">arman solos</span>
        </h1>

        <p className="hero__lead">
          Sistema de gestión para una agencia de viajes: cataloga actividades y atracciones,
          recorre la red de conexiones entre ellas y genera itinerarios equilibrados por
          categoría, tipo y nivel de esfuerzo físico.
        </p>

        <div className="hero__actions">
          <a className="btn btn--primary" href="/docs">
            Documentación de la API
          </a>
          <a
            className="btn"
            href="https://github.com/alfonsotejeda/astarship"
            target="_blank"
            rel="noreferrer"
          >
            Repositorio
          </a>
        </div>

        <ApiStatus />
      </main>

      <section className="section">
        <h2 className="section__title">Stack</h2>
        <ul className="cards">
          {STACK.map((t) => (
            <li className="card" key={t.nombre}>
              <span className="card__bar" style={{ background: t.color }} aria-hidden="true" />
              <strong>{t.nombre}</strong>
              <span className="card__role">{t.papel}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="section">
        <h2 className="section__title">Equipo</h2>
        <ul className="team">
          {EQUIPO.map((p) => (
            <li className="team__row" key={p.github}>
              <span className="team__name">{p.nombre}</span>
              <span className="team__group">{p.grupo}</span>
              <a
                className="team__handle"
                href={`https://github.com/${p.github}`}
                target="_blank"
                rel="noreferrer"
              >
                @{p.github}
              </a>
            </li>
          ))}
        </ul>
      </section>

      <footer className="footer">
        <span>Astarship · A* + starship</span>
        <span className="footer__dot" aria-hidden="true">
          ·
        </span>
        <span>Facultad de Matemática y Computación</span>
      </footer>
    </div>
  );
}

export default App;
